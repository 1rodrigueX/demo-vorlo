"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId, getTenantSlug } from "@/lib/auth/current-user";
import { lancamentoSchema } from "@/lib/validation/financas";
import type { FinancasLancamento } from "@/types/domain";

export type ActionState = { error?: string } | null;

/** Todos os lançamentos do ano/contexto — agregação (por mês, por categoria etc.) acontece no client, volume baixo o suficiente pra isso ser simples e rápido. */
export async function getLancamentos(context: "pessoal" | "empresarial", year: number): Promise<FinancasLancamento[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return [];

  const { data } = await supabase
    .from("financas_lancamentos")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("context", context)
    .gte("entry_date", `${year}-01-01`)
    .lte("entry_date", `${year}-12-31`)
    .order("entry_date", { ascending: true });

  return data ?? [];
}

export async function createLancamento(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = lancamentoSchema.safeParse({
    context: formData.get("context"),
    type: formData.get("type"),
    category: formData.get("category"),
    description: formData.get("description"),
    amountReais: formData.get("amountReais"),
    entryDate: formData.get("entryDate"),
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

  const { error } = await supabase.from("financas_lancamentos").insert({
    tenant_id: tenantId,
    context: parsed.data.context,
    type: parsed.data.type,
    category: parsed.data.category,
    description: parsed.data.description || null,
    amount_cents: Math.round(parsed.data.amountReais * 100),
    entry_date: parsed.data.entryDate,
    created_by: user.id,
  });

  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  const slug = await getTenantSlug(supabase, tenantId);
  if (slug) revalidatePath(`/${slug}/financeiro`);
  return null;
}

export async function deleteLancamento(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return;
  await supabase.from("financas_lancamentos").delete().eq("id", id).eq("tenant_id", tenantId);

  const slug = await getTenantSlug(supabase, tenantId);
  if (slug) revalidatePath(`/${slug}/financeiro`);
}
