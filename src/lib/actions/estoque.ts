"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId, getTenantSlug } from "@/lib/auth/current-user";
import { ensureCategoria } from "@/lib/actions/financas-categorias";
import { estoqueItemSchema, estoqueMovimentacaoSchema } from "@/lib/validation/financas";
import type { EstoqueItem, EstoqueMovimentacao } from "@/types/domain";

export type ActionState = { error?: string } | null;

export async function getEstoqueItens(): Promise<EstoqueItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return [];

  const { data } = await supabase
    .from("estoque_itens")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  return data ?? [];
}

export async function getRecentMovimentacoes(): Promise<EstoqueMovimentacao[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return [];

  const { data } = await supabase
    .from("estoque_movimentacoes")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(20);

  return data ?? [];
}

export async function createEstoqueItem(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = estoqueItemSchema.safeParse({
    name: formData.get("name"),
    unit: formData.get("unit"),
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

  const { error } = await supabase.from("estoque_itens").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    unit: parsed.data.unit || "un",
  });

  if (error) {
    const message = error.code === "23505" ? "Já existe um item com esse nome" : error.message;
    return { error: `Não foi possível criar: ${message}` };
  }

  const slug = await getTenantSlug(supabase, tenantId);
  if (slug) revalidatePath(`/${slug}/financeiro/estoque`);
  return null;
}

export async function deleteEstoqueItem(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const tenantId = await requireTenantId(supabase, user.id);
  await supabase.from("estoque_itens").delete().eq("id", id);

  const slug = tenantId ? await getTenantSlug(supabase, tenantId) : null;
  if (slug) revalidatePath(`/${slug}/financeiro/estoque`);
}

/**
 * Registra entrada (compra) ou saída de estoque. Entrada já lança
 * automaticamente como despesa em Empresarial — é o "gasto" virando saída
 * financeira que foi pedido. Saída só abate a quantidade (uso/venda/perda),
 * sem lançamento — o custo já foi contabilizado na entrada.
 */
export async function registrarMovimentacao(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = estoqueMovimentacaoSchema.safeParse({
    itemId: formData.get("itemId"),
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    unitCostReais: formData.get("unitCostReais") || undefined,
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { itemId, type, quantity, note } = parsed.data;

  if (type === "entrada" && (!parsed.data.unitCostReais || parsed.data.unitCostReais <= 0)) {
    return { error: "Informe o custo unitário da entrada" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: item } = await supabase
    .from("estoque_itens")
    .select("*")
    .eq("id", itemId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!item) return { error: "Item não encontrado" };

  if (type === "saida" && quantity > Number(item.quantity)) {
    return { error: `Quantidade insuficiente em estoque (disponível: ${item.quantity} ${item.unit})` };
  }

  const unitCostCents =
    type === "entrada" ? Math.round((parsed.data.unitCostReais ?? 0) * 100) : item.unit_cost_cents;
  const totalCents = Math.round(unitCostCents * quantity);

  const { error: movError } = await supabase.from("estoque_movimentacoes").insert({
    tenant_id: tenantId,
    item_id: itemId,
    type,
    quantity,
    unit_cost_cents: unitCostCents,
    total_cents: totalCents,
    note: note || null,
    created_by: user.id,
  });
  if (movError) return { error: `Não foi possível registrar: ${movError.message}` };

  const newQuantity = type === "entrada" ? Number(item.quantity) + quantity : Number(item.quantity) - quantity;
  const { error: updateError } = await supabase
    .from("estoque_itens")
    .update({
      quantity: newQuantity,
      ...(type === "entrada" ? { unit_cost_cents: unitCostCents } : {}),
    })
    .eq("id", itemId);
  if (updateError) return { error: `Registrado, mas não deu pra atualizar a quantidade: ${updateError.message}` };

  if (type === "entrada") {
    await ensureCategoria(supabase, tenantId, "despesa", "Estoque");
    const { error: lancamentoError } = await supabase.from("financas_lancamentos").insert({
      tenant_id: tenantId,
      context: "empresarial",
      type: "despesa",
      category: "Estoque",
      description: `Compra de estoque — ${item.name}`,
      amount_cents: totalCents,
      entry_date: new Date().toISOString().slice(0, 10),
      source: "estoque",
      created_by: user.id,
    });
    if (lancamentoError) {
      return { error: `Estoque atualizado, mas não deu pra lançar em Empresarial: ${lancamentoError.message}` };
    }
  }

  const slug = await getTenantSlug(supabase, tenantId);
  if (slug) {
    revalidatePath(`/${slug}/financeiro/estoque`);
    revalidatePath(`/${slug}/financeiro`);
  }
  return null;
}
