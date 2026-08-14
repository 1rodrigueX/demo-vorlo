"use server";

import { revalidatePath } from "next/cache";
import type { DbClient } from "@/lib/db/queryClient";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId, getTenantSlug } from "@/lib/auth/current-user";
import { categoriaSchema } from "@/lib/validation/financas";
import { CHART_COLORS } from "@/lib/financas/categories";
import type { FinancasCategoria } from "@/types/domain";

export type ActionState = { error?: string } | null;

const PALETTE_ORDER = Object.values(CHART_COLORS);

/** Garante que uma categoria existe (cria se faltar) — usado por integrações automáticas (Caixa de Entrada, Estoque) que precisam de uma categoria específica sem depender do usuário ter criado antes. */
export async function ensureCategoria(
  supabase: DbClient,
  tenantId: string,
  type: "receita" | "despesa",
  name: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from("financas_categorias")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("type", type)
    .ilike("name", name)
    .maybeSingle();
  if (existing) return;

  const { count } = await supabase
    .from("financas_categorias")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("type", type);
  const position = count ?? 0;
  const color = PALETTE_ORDER[position % PALETTE_ORDER.length];

  await supabase.from("financas_categorias").insert({ tenant_id: tenantId, type, name, color, position });
}

export async function getCategorias(): Promise<FinancasCategoria[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return [];

  const { data } = await supabase
    .from("financas_categorias")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("type", { ascending: true })
    .order("position", { ascending: true });

  return data ?? [];
}

export async function createCategoria(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = categoriaSchema.safeParse({
    type: formData.get("type"),
    name: formData.get("name"),
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
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { count } = await supabase
    .from("financas_categorias")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("type", parsed.data.type);
  const position = count ?? 0;
  // Cicla pela paleta validada (dataviz skill) na ordem fixa — não gera cor nova.
  const color = PALETTE_ORDER[position % PALETTE_ORDER.length];

  const { error } = await supabase.from("financas_categorias").insert({
    tenant_id: tenantId,
    type: parsed.data.type,
    name: parsed.data.name,
    color,
    position,
  });

  if (error) {
    const message = error.code === "23505" ? "Já existe uma categoria com esse nome" : error.message;
    return { error: `Não foi possível criar: ${message}` };
  }

  const slug = await getTenantSlug(supabase, tenantId);
  if (slug) revalidatePath(`/${slug}/financeiro/configuracoes`);
  return null;
}

export async function deleteCategoria(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return;
  await supabase.from("financas_categorias").delete().eq("id", id).eq("tenant_id", tenantId);

  const slug = await getTenantSlug(supabase, tenantId);
  if (slug) revalidatePath(`/${slug}/financeiro/configuracoes`);
}
