"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId, getTenantSlug } from "@/lib/auth/current-user";
import { syncContactToBling } from "@/lib/bling/sync";
import { contactSchema } from "@/lib/validation/contact";
import { normalizePhone, isDuplicatePhoneError } from "@/lib/crm/phone";

export type ActionState = { error?: string } | null;

/**
 * Mensagem para quando o índice único de telefone (ver 0070_contact_dedupe)
 * barra o cadastro. Nomeia o contato que já ocupa aquele número — sem isso o
 * vendedor só vê "erro ao salvar" e cadastra de novo com o telefone torto,
 * que é exatamente a duplicata que a trava existe pra evitar.
 */
async function duplicatePhoneMessage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  phone: string | null | undefined,
): Promise<string> {
  const phoneKey = normalizePhone(phone);
  if (!phoneKey) return "Já existe um contato com este telefone.";

  const { data: existing } = await supabase
    .from("contacts")
    .select("name")
    .eq("tenant_id", tenantId)
    .eq("phone_key", phoneKey)
    .maybeSingle();

  return existing
    ? `Este telefone já está cadastrado em "${existing.name}". Abra esse contato em vez de criar outro.`
    : "Este telefone já está cadastrado em um contato de outro vendedor. Peça para um administrador localizá-lo.";
}

/**
 * Cria a empresa informada inline no formulário de contato (quando o
 * vendedor não quer sair pra tela de Empresas) e retorna o id dela.
 */
async function createInlineCompany(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tenantId: string,
  name: string,
  website?: string | null,
  notes?: string | null,
) {
  const { data, error } = await supabase
    .from("companies")
    .insert({
      tenant_id: tenantId,
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
    cpfCnpj: formData.get("cpfCnpj"),
    addressZip: formData.get("addressZip"),
    addressStreet: formData.get("addressStreet"),
    addressNumber: formData.get("addressNumber"),
    addressComplement: formData.get("addressComplement"),
    addressNeighborhood: formData.get("addressNeighborhood"),
    addressCity: formData.get("addressCity"),
    addressState: formData.get("addressState"),
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

  let companyId = parsed.data.companyId || null;
  if (parsed.data.companyName) {
    companyId = await createInlineCompany(
      supabase,
      user.id,
      tenantId,
      parsed.data.companyName,
      parsed.data.companyWebsite,
      parsed.data.companyNotes,
    );
    if (!companyId) return { error: "Não foi possível criar a empresa" };
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      tenant_id: tenantId,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      lead_source: parsed.data.leadSource || null,
      company_id: companyId,
      created_by: user.id,
      cpf_cnpj: parsed.data.cpfCnpj || null,
      address_zip: parsed.data.addressZip || null,
      address_street: parsed.data.addressStreet || null,
      address_number: parsed.data.addressNumber || null,
      address_complement: parsed.data.addressComplement || null,
      address_neighborhood: parsed.data.addressNeighborhood || null,
      address_city: parsed.data.addressCity || null,
      address_state: parsed.data.addressState || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (isDuplicatePhoneError(error)) {
      return { error: await duplicatePhoneMessage(supabase, tenantId, parsed.data.phone) };
    }
    console.error("createContact failed:", error);
    return { error: `Não foi possível criar o contato: ${error?.message ?? "erro desconhecido"}` };
  }

  void syncContactToBling(tenantId, {
    id: data.id,
    name: parsed.data.name,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    cpfCnpj: parsed.data.cpfCnpj || null,
    address: {
      zip: parsed.data.addressZip || null,
      street: parsed.data.addressStreet || null,
      number: parsed.data.addressNumber || null,
      complement: parsed.data.addressComplement || null,
      neighborhood: parsed.data.addressNeighborhood || null,
      city: parsed.data.addressCity || null,
      state: parsed.data.addressState || null,
    },
  });

  revalidatePath("/[tenantSlug]/contacts", "page");
  revalidatePath("/[tenantSlug]/companies", "page");
  const slug = await getTenantSlug(supabase, tenantId);
  redirect(`/${slug}/contacts/${data.id}`);
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
    cpfCnpj: formData.get("cpfCnpj"),
    addressZip: formData.get("addressZip"),
    addressStreet: formData.get("addressStreet"),
    addressNumber: formData.get("addressNumber"),
    addressComplement: formData.get("addressComplement"),
    addressNeighborhood: formData.get("addressNeighborhood"),
    addressCity: formData.get("addressCity"),
    addressState: formData.get("addressState"),
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
    const tenantId = await requireTenantId(supabase, user.id);
    if (!tenantId) return { error: "Tenant não encontrado para este usuário" };

    companyId = await createInlineCompany(
      supabase,
      user.id,
      tenantId,
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
      cpf_cnpj: parsed.data.cpfCnpj || null,
      address_zip: parsed.data.addressZip || null,
      address_street: parsed.data.addressStreet || null,
      address_number: parsed.data.addressNumber || null,
      address_complement: parsed.data.addressComplement || null,
      address_neighborhood: parsed.data.addressNeighborhood || null,
      address_city: parsed.data.addressCity || null,
      address_state: parsed.data.addressState || null,
    })
    .eq("id", contactId);

  if (error) {
    if (isDuplicatePhoneError(error)) {
      const tenantId = await requireTenantId(supabase, user.id);
      return {
        error: tenantId
          ? await duplicatePhoneMessage(supabase, tenantId, parsed.data.phone)
          : "Este telefone já está cadastrado em outro contato.",
      };
    }
    console.error("updateContact failed:", error);
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/[tenantSlug]/contacts", "page");
  revalidatePath(`/[tenantSlug]/contacts/${contactId}`, "page");
  revalidatePath("/[tenantSlug]/companies", "page");
  return null;
}

/**
 * Reatribui o vendedor responsável pelo contato — RLS só deixa o dono/gerente
 * mudar pra outra pessoa. Também reatribui os negócios ainda abertos desse
 * contato (só os abertos: não reescreve o histórico de quem fechou/perdeu um
 * negócio já encerrado), senão o card do pipeline continuaria mostrando o
 * vendedor antigo mesmo depois de trocar aqui.
 */
export async function updateContactOwner(contactId: string, ownerId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("contacts").update({ created_by: ownerId }).eq("id", contactId);

  if (error) {
    return { error: "Não foi possível reatribuir o contato (só o dono da conta pode mudar o vendedor)" };
  }

  await supabase.from("deals").update({ owner_id: ownerId }).eq("contact_id", contactId).eq("status", "open");

  revalidatePath("/[tenantSlug]/contacts", "page");
  revalidatePath(`/[tenantSlug]/contacts/${contactId}`, "page");
  revalidatePath("/[tenantSlug]/pipeline", "page");
  return { error: undefined };
}

export async function deleteContact(contactId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = user ? await requireTenantId(supabase, user.id) : null;
  await supabase.from("contacts").delete().eq("id", contactId);
  revalidatePath("/[tenantSlug]/contacts", "page");
  const slug = tenantId ? await getTenantSlug(supabase, tenantId) : null;
  redirect(slug ? `/${slug}/contacts` : "/login");
}
