import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Dispara quando um negócio do CRM é movido pra um estágio de "ganho" —
 * abate do estoque cada produto vinculado ao negócio (ver deal_produtos).
 * De propósito NÃO bloqueia se faltar estoque: decisão explícita do dono
 * pra nunca travar o vendedor — a quantidade só fica negativa, sinalizando
 * a falta. Fire-and-forget: nunca deve quebrar o fluxo de mover o negócio.
 */
export async function baixarEstoqueVenda(tenantId: string, dealId: string, dealTitle: string): Promise<void> {
  if (!tenantId || !dealId) return;

  try {
    const admin = createAdminClient();

    const { data: product } = await admin
      .from("tenant_products")
      .select("status")
      .eq("tenant_id", tenantId)
      .eq("product", "estoque")
      .eq("status", "active")
      .maybeSingle();
    if (!product) return;

    const { data: itens } = await admin
      .from("deal_produtos")
      .select<{
        estoque_item_id: string;
        quantity: number;
        estoque_item: { quantity: number; unit_cost_cents: number } | null;
      }>("estoque_item_id, quantity, estoque_item:estoque_itens(quantity, unit_cost_cents)")
      .eq("deal_id", dealId);
    if (!itens || itens.length === 0) return;

    for (const item of itens) {
      const estoqueItem = item.estoque_item;
      if (!estoqueItem) continue;

      const quantity = Number(item.quantity);
      await admin
        .from("estoque_itens")
        .update({ quantity: Number(estoqueItem.quantity) - quantity })
        .eq("id", item.estoque_item_id);

      await admin.from("estoque_movimentacoes").insert({
        tenant_id: tenantId,
        item_id: item.estoque_item_id,
        type: "saida",
        quantity,
        unit_cost_cents: estoqueItem.unit_cost_cents,
        total_cents: Math.round(estoqueItem.unit_cost_cents * quantity),
        note: `Venda — ${dealTitle}`,
      });
    }
  } catch {
    // best-effort — nunca deve derrubar o fluxo de mover o negócio no pipeline.
  }
}
