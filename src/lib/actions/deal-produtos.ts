"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId, getTenantSlug } from "@/lib/auth/current-user";
import { dealProdutoSchema } from "@/lib/validation/deal-produto";
import type { DealProduto, EstoqueItem } from "@/types/domain";

export type ActionState = { error?: string } | null;
export type DealProdutoWithItem = DealProduto & { estoque_item: EstoqueItem | null };

async function revalidateDealContact(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  dealId: string,
) {
  const { data: deal } = await supabase
    .from("deals")
    .select("contact_id")
    .eq("id", dealId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  const slug = await getTenantSlug(supabase, tenantId);
  if (slug && deal) revalidatePath(`/${slug}/contacts/${deal.contact_id}`, "page");
}

/** Busca os produtos vendidos de vários negócios de uma vez — evita N+1 na lista de negócios do contato. */
export async function getDealProdutosForDeals(dealIds: string[]): Promise<Record<string, DealProdutoWithItem[]>> {
  if (dealIds.length === 0) return {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = user ? await requireTenantId(supabase, user.id) : null;
  if (!tenantId) return {};

  const { data } = await supabase
    .from("deal_produtos")
    .select("*, estoque_item:estoque_itens(*)")
    .eq("tenant_id", tenantId)
    .in("deal_id", dealIds);

  return ((data ?? []) as DealProdutoWithItem[]).reduce<Record<string, DealProdutoWithItem[]>>((acc, item) => {
    (acc[item.deal_id] ??= []).push(item);
    return acc;
  }, {});
}

export async function getDealProdutosForDeal(dealId: string): Promise<DealProdutoWithItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = user ? await requireTenantId(supabase, user.id) : null;
  if (!tenantId) return [];

  const { data } = await supabase
    .from("deal_produtos")
    .select("*, estoque_item:estoque_itens(*)")
    .eq("deal_id", dealId)
    .eq("tenant_id", tenantId);
  return (data ?? []) as DealProdutoWithItem[];
}

export async function addDealProduto(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = dealProdutoSchema.safeParse({
    dealId: formData.get("dealId"),
    estoqueItemId: formData.get("estoqueItemId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { error } = await supabase.from("deal_produtos").insert({
    tenant_id: tenantId,
    deal_id: parsed.data.dealId,
    estoque_item_id: parsed.data.estoqueItemId,
    quantity: parsed.data.quantity,
  });
  if (error) return { error: `Não foi possível adicionar: ${error.message}` };

  await revalidateDealContact(supabase, tenantId, parsed.data.dealId);
  return null;
}

export async function removeDealProduto(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return;

  const { data: dealProduto } = await supabase
    .from("deal_produtos")
    .select("deal_id")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!dealProduto) return;

  await supabase.from("deal_produtos").delete().eq("id", id).eq("tenant_id", tenantId);

  await revalidateDealContact(supabase, tenantId, dealProduto.deal_id);
}
