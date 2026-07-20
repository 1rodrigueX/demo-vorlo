import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Dispara quando um negócio do CRM é movido pra um estágio de "ganho" —
 * cria um item pendente na Caixa de Entrada do Controle Empresarial em vez
 * de já lançar direto (o dono confirma antes, pode editar categoria/valor).
 * Fire-and-forget: nunca deve quebrar o fluxo de mover o negócio no pipeline.
 */
export async function createDealWonInboxEntry(
  tenantId: string,
  dealId: string,
  dealTitle: string,
  value: number,
): Promise<void> {
  if (!tenantId || !dealId || !Number.isFinite(value) || value <= 0) return;

  try {
    const admin = createAdminClient();

    const { data: product } = await admin
      .from("tenant_products")
      .select("status")
      .eq("tenant_id", tenantId)
      .eq("product", "financas")
      .eq("status", "active")
      .maybeSingle();
    if (!product) return;

    await admin.from("financas_inbox").insert({
      tenant_id: tenantId,
      source: "crm_deal",
      reference_id: dealId,
      type: "receita",
      category: "Vendas",
      description: dealTitle,
      amount_cents: Math.round(value * 100),
      entry_date: new Date().toISOString().slice(0, 10),
    });
  } catch {
    // índice único (source, reference_id) evita duplicata; qualquer outro
    // erro aqui não deve derrubar o fluxo de mover o negócio no pipeline.
  }
}
