import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import type { Contact } from "@/types/domain";

/**
 * "Clientes" do ERP é a MESMA tabela contacts do CRM — sem cópia, sem tabela
 * nova. Criar/editar/excluir continua sendo responsabilidade do CRM
 * (createContact/updateContact/deleteContact em src/lib/actions/contacts.ts,
 * que fazem bem mais coisa — sync com Bling, disparo de automações, checagem
 * de duplicidade — do que faria sentido duplicar aqui); o ERP só lê e linka
 * pro contato de verdade em /{tenantSlug}/contacts/{id}.
 */
export type ErpCliente = Contact & { status: "ativo" | "inativo" };

export async function getErpClientes(): Promise<ErpCliente[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return [];

  const { data } = await supabase.from("contacts").select("*").eq("tenant_id", tenantId).order("name");

  return (data ?? []).map((c) => ({ ...c, status: c.opted_out_at ? "inativo" : "ativo" }) as ErpCliente);
}
