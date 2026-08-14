"use server";

import { createClient } from "@/lib/supabase/server";
import { currentTenantContext, revalidateTenantPaths } from "@/lib/auth/current-user";
import { currentActorTenantContext } from "@/lib/producao/actor";
import { produtoSchema, receitaItemSchema } from "@/lib/validation/producao";
import type { ProducaoProduto, ProducaoReceitaItem, EstoqueItem } from "@/types/domain";

export type ActionState = { error?: string } | null;

async function revalidateProducao(supabase: Awaited<ReturnType<typeof createClient>>, tenantId: string) {
  await revalidateTenantPaths(supabase, tenantId, ["/producao/configuracoes"]);
}

export async function getProdutos(): Promise<(ProducaoProduto & { estoque_item: EstoqueItem | null })[]> {
  const { supabase, tenantId } = await currentActorTenantContext();
  if (!tenantId) return [];

  const { data } = await supabase
    .from("producao_produtos")
    .select("*, estoque_item:estoque_itens(*)")
    .eq("tenant_id", tenantId)
    .order("name");

  return (data ?? []) as (ProducaoProduto & { estoque_item: EstoqueItem | null })[];
}

export async function getEstoqueItensParaReceita(): Promise<EstoqueItem[]> {
  const { supabase, tenantId } = await currentTenantContext();
  if (!tenantId) return [];
  const { data } = await supabase.from("estoque_itens").select("*").eq("tenant_id", tenantId).order("name");
  return data ?? [];
}

/** Todos os itens de receita do tenant de uma vez (evita N+1 — o caller agrupa por produto_id). */
export async function getAllReceitaItens(): Promise<(ProducaoReceitaItem & { materia_prima: EstoqueItem | null })[]> {
  const { supabase, tenantId } = await currentTenantContext();
  if (!tenantId) return [];

  const { data } = await supabase
    .from("producao_receita_itens")
    .select("*, materia_prima:estoque_itens!producao_receita_itens_materia_prima_id_fkey(*)")
    .eq("tenant_id", tenantId);

  return (data ?? []) as (ProducaoReceitaItem & { materia_prima: EstoqueItem | null })[];
}

/**
 * Cria um produto de produção — já cria o item de estoque correspondente
 * (produto acabado) automaticamente, é o "já linka com o controle de
 * estoque" pedido: o dono não precisa ir cadastrar o item em Estoque à
 * parte. Exige o Estoque ativo (Produção não substitui esse produto).
 */
export async function createProduto(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = produtoSchema.safeParse({
    name: formData.get("name"),
    unit: formData.get("unit"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { supabase, user, tenantId } = await currentTenantContext();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: hasEstoque } = await supabase.rpc("current_tenant_has_estoque", { p_user_id: user.id });
  if (!hasEstoque) {
    return { error: "Ative o Controle de Estoque pra poder cadastrar produtos (Produção linka os dois)" };
  }

  const { data: estoqueItem, error: estoqueError } = await supabase
    .from("estoque_itens")
    .insert({ tenant_id: tenantId, name: parsed.data.name, unit: parsed.data.unit || "un" })
    .select("id")
    .single();
  if (estoqueError || !estoqueItem) {
    const message = estoqueError?.code === "23505" ? "Já existe um item de estoque com esse nome" : estoqueError?.message;
    return { error: `Não foi possível criar o item de estoque: ${message ?? "erro desconhecido"}` };
  }

  const { error: produtoError } = await supabase.from("producao_produtos").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    estoque_item_id: estoqueItem.id,
  });
  if (produtoError) {
    await supabase.from("estoque_itens").delete().eq("id", estoqueItem.id);
    const message = produtoError.code === "23505" ? "Já existe um produto com esse nome" : produtoError.message;
    return { error: `Não foi possível criar o produto: ${message}` };
  }

  await revalidateProducao(supabase, tenantId);
  return null;
}

export async function deleteProduto(id: string) {
  const { supabase, tenantId } = await currentTenantContext();
  if (!tenantId) return;
  // Não apaga o item de estoque vinculado — histórico de movimentação continua íntegro.
  await supabase.from("producao_produtos").delete().eq("id", id).eq("tenant_id", tenantId);
  await revalidateProducao(supabase, tenantId);
}

export async function addReceitaItem(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = receitaItemSchema.safeParse({
    produtoId: formData.get("produtoId"),
    materiaPrimaId: formData.get("materiaPrimaId"),
    quantityPerUnit: formData.get("quantityPerUnit"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { supabase, user, tenantId } = await currentTenantContext();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { error } = await supabase.from("producao_receita_itens").insert({
    tenant_id: tenantId,
    produto_id: parsed.data.produtoId,
    materia_prima_id: parsed.data.materiaPrimaId,
    quantity_per_unit: parsed.data.quantityPerUnit,
  });
  if (error) {
    const message = error.code === "23505" ? "Essa matéria-prima já está na receita" : error.message;
    return { error: `Não foi possível adicionar: ${message}` };
  }

  await revalidateProducao(supabase, tenantId);
  return null;
}

export async function deleteReceitaItem(id: string) {
  const { supabase, tenantId } = await currentTenantContext();
  if (!tenantId) return;
  await supabase.from("producao_receita_itens").delete().eq("id", id).eq("tenant_id", tenantId);
  await revalidateProducao(supabase, tenantId);
}
