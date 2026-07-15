"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { companySchema } from "@/lib/validation/company";

export type ActionState = { error?: string } | null;

export async function createCompany(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    website: formData.get("website"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado para este usuário" };

  const { data, error } = await supabase
    .from("companies")
    .insert({
      tenant_id: tenantId,
      name: parsed.data.name,
      website: parsed.data.website || null,
      notes: parsed.data.notes || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createCompany failed:", error);
    return { error: `Não foi possível criar a empresa: ${error?.message ?? "erro desconhecido"}` };
  }

  revalidatePath("/companies");
  redirect(`/companies/${data.id}`);
}

export async function updateCompany(
  companyId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    website: formData.get("website"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      name: parsed.data.name,
      website: parsed.data.website || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", companyId);

  if (error) {
    console.error("updateCompany failed:", error);
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  return null;
}

export async function deleteCompany(companyId: string) {
  const supabase = await createClient();
  await supabase.from("companies").delete().eq("id", companyId);
  revalidatePath("/companies");
  redirect("/companies");
}
