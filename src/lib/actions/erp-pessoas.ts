import { currentTenantContext } from "@/lib/auth/current-user";
import type { Profile } from "@/types/domain";

/**
 * "Vendedores" e "Usuários" do ERP são a mesma tabela profiles do CRM — não
 * existe uma tabela de vendedor separada no schema real (só a role do
 * profile: owner/manager/member). Somente leitura — gestão de conta continua
 * no CRM, não duplicar aqui.
 */
export async function getErpProfiles(): Promise<Profile[]> {
  const { supabase, tenantId } = await currentTenantContext();
  if (!tenantId) return [];

  const { data } = await supabase.from("profiles").select("*").eq("tenant_id", tenantId).order("full_name");
  return data ?? [];
}
