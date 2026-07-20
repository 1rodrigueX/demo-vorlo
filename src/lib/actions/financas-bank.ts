"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId, getTenantSlug } from "@/lib/auth/current-user";
import { generateMockHistory, generateMockSyncBatch } from "@/lib/financas/mockBank";
import type { FinancasBankConnection } from "@/types/domain";

export type ActionState = { error?: string } | null;

export async function getBankConnection(): Promise<FinancasBankConnection | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return null;

  const { data } = await supabase
    .from("financas_bank_connections")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return data ?? null;
}

/**
 * "Conecta" um banco simulado — sem nenhum agregador Open Finance real por
 * trás ainda (ver conversa sobre Pluggy/Belvo). Cria a linha de conexão e já
 * importa ~3 meses de extrato de exemplo pra experiência ficar completa.
 */
export async function connectBank(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const [{ data: despesaCategorias }, { data: receitaCategorias }] = await Promise.all([
    supabase.from("financas_categorias").select("name").eq("tenant_id", tenantId).eq("type", "despesa"),
    supabase.from("financas_categorias").select("name").eq("tenant_id", tenantId).eq("type", "receita"),
  ]);

  const { error: connError } = await supabase.from("financas_bank_connections").upsert(
    {
      tenant_id: tenantId,
      provider: "mock",
      institution_name: "Banco Simulado",
      status: "connected",
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id" },
  );
  if (connError) return { error: `Não foi possível conectar: ${connError.message}` };

  const history = generateMockHistory(despesaCategorias ?? [], receitaCategorias ?? []);
  if (history.length > 0) {
    // external_id tem índice único (parcial), mas o supabase-js não infere
    // arbiter em índice parcial — filtra os já importados aqui em vez de
    // depender de ON CONFLICT (volume baixo, reconectar não é uma ação frequente).
    const { data: existing } = await supabase
      .from("financas_lancamentos")
      .select("external_id")
      .eq("tenant_id", tenantId)
      .not("external_id", "is", null);
    const existingIds = new Set((existing ?? []).map((r) => r.external_id));
    const toInsert = history.filter((t) => !existingIds.has(t.external_id));

    if (toInsert.length > 0) {
      const { error: importError } = await supabase.from("financas_lancamentos").insert(
        toInsert.map((t) => ({
          ...t,
          tenant_id: tenantId,
          context: "pessoal" as const,
          source: "open_finance" as const,
          created_by: user.id,
        })),
      );
      if (importError) return { error: `Conexão feita, mas a importação falhou: ${importError.message}` };
    }
  }

  const slug = await getTenantSlug(supabase, tenantId);
  if (slug) revalidatePath(`/${slug}/financeiro`);
  return null;
}

/** Simula uma nova sincronização trazendo movimentação recente. */
export async function resyncBank(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: despesaCategorias } = await supabase
    .from("financas_categorias")
    .select("name")
    .eq("tenant_id", tenantId)
    .eq("type", "despesa");

  const batch = generateMockSyncBatch(despesaCategorias ?? []);
  if (batch.length > 0) {
    const { error: importError } = await supabase.from("financas_lancamentos").insert(
      batch.map((t) => ({ ...t, tenant_id: tenantId, context: "pessoal" as const, source: "open_finance" as const, created_by: user.id })),
    );
    if (importError) return { error: `Não foi possível sincronizar: ${importError.message}` };
  }

  const { error: touchError } = await supabase
    .from("financas_bank_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("tenant_id", tenantId);
  if (touchError) return { error: `Não foi possível sincronizar: ${touchError.message}` };

  const slug = await getTenantSlug(supabase, tenantId);
  if (slug) revalidatePath(`/${slug}/financeiro`);
  return null;
}

/** Desconecta — mantém os lançamentos já importados, só para de sincronizar. */
export async function disconnectBank(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { error } = await supabase
    .from("financas_bank_connections")
    .update({ status: "disconnected" })
    .eq("tenant_id", tenantId);
  if (error) return { error: `Não foi possível desconectar: ${error.message}` };

  const slug = await getTenantSlug(supabase, tenantId);
  if (slug) revalidatePath(`/${slug}/financeiro`);
  return null;
}
