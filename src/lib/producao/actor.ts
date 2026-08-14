import "server-only";
import type { DbClient } from "@/lib/db/queryClient";
import { createClient, type SessionClient } from "@/lib/supabase/server";
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
  supabase: DbClient,
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

/**
 * Como currentTenantContext() (ver src/lib/auth/current-user.ts), mas também
 * resolve funcionário de Produção — só pra leituras (mutações continuam
 * exigindo requireTenantId/currentTenantContext direto, dono apenas).
 */
export async function currentActorTenantContext(): Promise<{
  supabase: SessionClient;
  user: Awaited<ReturnType<SessionClient["auth"]["getUser"]>>["data"]["user"];
  tenantId: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, tenantId: null };
  const tenantId = await requireProducaoActorTenantId(supabase, user.id);
  return { supabase, user, tenantId };
}
