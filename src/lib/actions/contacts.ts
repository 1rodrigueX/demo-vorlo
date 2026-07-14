"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { contactSchema } from "@/lib/validation/contact";

export type ActionState = { error?: string } | null;

/**
 * Cria a empresa informada inline no formulário de contato (quando o
 * vendedor não quer sair pra tela de Empresas) e retorna o id dela.
 */
async function createInlineCompany(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  name: string,
  website?: string,
  notes?: string,
) {
  const { data, error } = await supabase
    .from("companies")
    .insert({
      name,
      website: website || null,
      notes: notes || null,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createInlineCompany failed:", error);
    return null;
  }
  return data.id;
}

export async function createContact(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    leadSource: formData.get("leadSource"),
    companyId: formData.get("companyId"),
    companyName: formData.get("companyName"),
    companyWebsite: formData.get("companyWebsite"),
    companyNotes: formData.get("companyNotes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  let companyId = parsed.data.companyId || null;
  if (parsed.data.companyName) {
    companyId = await createInlineCompany(
      supabase,
      user.id,
      parsed.data.companyName,
      parsed.data.companyWebsite,
      parsed.data.companyNotes,
    );
    if (!companyId) return { error: "Não foi possível criar a empresa" };
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      lead_source: parsed.data.leadSource || null,
      company_id: companyId,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createContact failed:", error);
    return { error: `Não foi possível criar o contato: ${error?.message ?? "erro desconhecido"}` };
  }

  revalidatePath("/contacts");
  revalidatePath("/companies");
  redirect(`/contacts/${data.id}`);
}

export async function updateContact(
  contactId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    leadSource: formData.get("leadSource"),
    companyId: formData.get("companyId"),
    companyName: formData.get("companyName"),
    companyWebsite: formData.get("companyWebsite"),
    companyNotes: formData.get("companyNotes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  let companyId = parsed.data.companyId || null;
  if (parsed.data.companyName) {
    companyId = await createInlineCompany(
      supabase,
      user.id,
      parsed.data.companyName,
      parsed.data.companyWebsite,
      parsed.data.companyNotes,
    );
    if (!companyId) return { error: "Não foi possível criar a empresa" };
  }

  const { error } = await supabase
    .from("contacts")
    .update({
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      lead_source: parsed.data.leadSource || null,
      company_id: companyId,
    })
    .eq("id", contactId);

  if (error) {
    console.error("updateContact failed:", error);
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/companies");
  return null;
}

export async function deleteContact(contactId: string) {
  const supabase = await createClient();
  await supabase.from("contacts").delete().eq("id", contactId);
  revalidatePath("/contacts");
  redirect("/contacts");
}
