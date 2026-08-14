"use server";

import { createClient } from "@/lib/supabase/server";
import { currentTenantContext, revalidateTenantPaths } from "@/lib/auth/current-user";
import { erpProdutoSchema } from "@/lib/validation/erp-cadastros";
import type { ErpProduto, ErpCategoria } from "@/types/domain";

export type ActionState = { error?: string } | null;

async function revalidateErpCadastros(supabase: Awaited<ReturnType<typeof createClient>>, tenantId: string) {
  await revalidateTenantPaths(supabase, tenantId, ["/erp/cadastros/produtos"]);
}

/** Confere que a categoria informada é do próprio tenant antes de linkar — sem isso um POST
 * forjado no Server Action (RLS está bypassada, ver src/lib/supabase/server.ts) conseguiria
 * apontar category_id pra categoria de outro tenant. */
async function validateOwnCategory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  categoryId: string | null,
): Promise<string | null> {
  if (!categoryId) return null;
  const { data } = await supabase.from("erp_categorias").select("id").eq("id", categoryId).eq("tenant_id", tenantId).maybeSingle();
  return data ? categoryId : null;
}

export async function getErpProdutos(): Promise<(ErpProduto & { category: ErpCategoria | null })[]> {
  const { supabase, tenantId } = await currentTenantContext();
  if (!tenantId) return [];
  const { data } = await supabase
    .from("erp_produtos")
    .select("*, category:erp_categorias(*)")
    .eq("tenant_id", tenantId)
    .order("name");
  return (data ?? []) as (ErpProduto & { category: ErpCategoria | null })[];
}

export async function createErpProduto(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = erpProdutoSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    categoryId: formData.get("categoryId"),
    unit: formData.get("unit"),
    costPriceReais: formData.get("costPriceReais"),
    salePriceReais: formData.get("salePriceReais"),
    quantity: formData.get("quantity"),
    minStock: formData.get("minStock"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { supabase, user, tenantId } = await currentTenantContext();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: hasErp } = await supabase.rpc("current_tenant_has_erp", { p_user_id: user.id });
  if (!hasErp) return { error: "ERP não está ativo pra este tenant" };

  const categoryId = await validateOwnCategory(supabase, tenantId, parsed.data.categoryId || null);

  const { error } = await supabase.from("erp_produtos").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    sku: parsed.data.sku || null,
    category_id: categoryId,
    unit: parsed.data.unit || "un",
    cost_price_cents: Math.round((parsed.data.costPriceReais ?? 0) * 100),
    sale_price_cents: Math.round((parsed.data.salePriceReais ?? 0) * 100),
    quantity: parsed.data.quantity ?? 0,
    min_stock: parsed.data.minStock ?? 0,
  });
  if (error) {
    const message = error.code === "23505" ? "Já existe um produto com esse nome ou SKU" : error.message;
    return { error: `Não foi possível criar: ${message}` };
  }

  await revalidateErpCadastros(supabase, tenantId);
  return null;
}

export async function updateErpProduto(id: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = erpProdutoSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    categoryId: formData.get("categoryId"),
    unit: formData.get("unit"),
    costPriceReais: formData.get("costPriceReais"),
    salePriceReais: formData.get("salePriceReais"),
    quantity: formData.get("quantity"),
    minStock: formData.get("minStock"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { supabase, user, tenantId } = await currentTenantContext();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: hasErp } = await supabase.rpc("current_tenant_has_erp", { p_user_id: user.id });
  if (!hasErp) return { error: "ERP não está ativo pra este tenant" };

  const categoryId = await validateOwnCategory(supabase, tenantId, parsed.data.categoryId || null);

  const { error } = await supabase
    .from("erp_produtos")
    .update({
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      category_id: categoryId,
      unit: parsed.data.unit || "un",
      cost_price_cents: Math.round((parsed.data.costPriceReais ?? 0) * 100),
      sale_price_cents: Math.round((parsed.data.salePriceReais ?? 0) * 100),
      quantity: parsed.data.quantity ?? 0,
      min_stock: parsed.data.minStock ?? 0,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) {
    const message = error.code === "23505" ? "Já existe um produto com esse nome ou SKU" : error.message;
    return { error: `Não foi possível salvar: ${message}` };
  }

  await revalidateErpCadastros(supabase, tenantId);
  return null;
}

export async function deleteErpProduto(id: string): Promise<{ error?: string }> {
  const { supabase, user, tenantId } = await currentTenantContext();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: hasErp } = await supabase.rpc("current_tenant_has_erp", { p_user_id: user.id });
  if (!hasErp) return { error: "ERP não está ativo pra este tenant" };

  const { error } = await supabase.from("erp_produtos").delete().eq("id", id).eq("tenant_id", tenantId);
  if (error) return { error: `Não foi possível excluir: ${error.message}` };

  await revalidateErpCadastros(supabase, tenantId);
  return {};
}
