import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { requireTenantId } from "@/lib/auth/current-user";

/**
 * Tenant de quem está chamando, seja dono (via profiles/dev-view) ou
 * funcionário de Produção (via producao_funcionarios) — funcionário não
 * tem profile de propósito (ver migration 0057), então requireTenantId
 * sozinho não resolve pra ele. Só usar em leituras (turnos/máquinas/
 * estilos/produtos) que a tela de apontamento do funcionário precisa;
 * mutações continuam exigindo requireTenantId (dono) direto.
 */
export async function requireProducaoActorTenantId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  const ownerTenantId = await requireTenantId(supabase, userId);
  if (ownerTenantId) return ownerTenantId;

  const { data } = await supabase
    .from("producao_funcionarios")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle();
  return data?.tenant_id ?? null;
}
