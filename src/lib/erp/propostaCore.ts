import "server-only";
import { getTenantSlug } from "@/lib/auth/current-user";
import type { createClient } from "@/lib/supabase/server";
import type { ErpProposta } from "@/types/domain";

/** Tipo estrutural comum entre o client de sessão (server.ts) e o de service
 * role (admin.ts) — os dois têm from/rpc com a mesma assinatura, o que muda é
 * só quem chama (form manual via "use server" action, ou a tool do SDR via
 * admin client). Não é "use server" de propósito: isso é um helper puro,
 * chamado dos dois lados, não uma Server Action cliente-chamável. */
type DbClient = Pick<Awaited<ReturnType<typeof createClient>>, "from" | "rpc">;

export type CoreItemInput = { produtoId: string; quantity: number; unitPriceCents?: number; discountPct?: number };
export type CoreOpts = {
  source: "manual" | "sdr";
  sellerId?: string | null;
  createdBy?: string | null;
  validUntil?: string | null;
  paymentTerm?: string | null;
  freightType?: "CIF" | "FOB";
  carrierId?: string | null;
  freightCents?: number;
  discountCents?: number;
  notes?: string | null;
  empresaId?: string | null;
};

/**
 * Núcleo compartilhado entre o form manual (Nova proposta) e a tool do SDR —
 * o preço de cada item SEMPRE vem de uma segunda leitura em erp_produtos.
 * unitPriceCents só é usado quando o chamador passa explicitamente (ajuste
 * manual do vendedor no form); a tool do SDR nunca informa esse campo no seu
 * schema, então o preço real do catálogo é o único caminho possível ali —
 * não é uma checagem que dá pra "esquecer de chamar", é a própria forma.
 */
export async function createErpPropostaCore(
  supabase: DbClient,
  tenantId: string,
  contactId: string,
  items: CoreItemInput[],
  opts: CoreOpts,
): Promise<{ proposta?: ErpProposta; error?: string }> {
  if (!items.length) return { error: "Adicione ao menos um produto" };

  const produtoIds = items.map((i) => i.produtoId);
  const { data: produtos } = await supabase
    .from("erp_produtos")
    .select("id, name, sale_price_cents")
    .eq("tenant_id", tenantId)
    .in("id", produtoIds);

  const produtoMap = new Map((produtos ?? []).map((p) => [p.id, p]));
  const resolvedItems: {
    produto_id: string;
    product_name_snapshot: string;
    quantity: number;
    unit_price_cents: number;
    discount_pct: number;
  }[] = [];
  for (const item of items) {
    const produto = produtoMap.get(item.produtoId);
    if (!produto) return { error: "Um dos produtos selecionados não pertence a este tenant" };
    resolvedItems.push({
      produto_id: produto.id,
      product_name_snapshot: produto.name,
      quantity: item.quantity,
      unit_price_cents: item.unitPriceCents ?? produto.sale_price_cents,
      discount_pct: item.discountPct ?? 0,
    });
  }

  let carrierId = opts.carrierId ?? null;
  if (carrierId) {
    const { data: carrier } = await supabase
      .from("erp_fornecedores")
      .select("id")
      .eq("id", carrierId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!carrier) carrierId = null;
  }

  let sellerId = opts.sellerId ?? null;
  if (sellerId) {
    const { data: seller } = await supabase.from("profiles").select("id").eq("id", sellerId).eq("tenant_id", tenantId).maybeSingle();
    if (!seller) sellerId = null;
  }

  // Se o tenant só tem 1 empresa cadastrada, ela é sempre a dona da proposta
  // (não força ninguém a escolher). Com 2+, o chamador precisa informar —
  // e mesmo informando, revalida que pertence a este tenant.
  let empresaId = opts.empresaId ?? null;
  if (empresaId) {
    const { data: empresa } = await supabase.from("erp_empresas").select("id").eq("id", empresaId).eq("tenant_id", tenantId).maybeSingle();
    if (!empresa) empresaId = null;
  }
  if (!empresaId) {
    const { data: empresas } = await supabase.from("erp_empresas").select("id").eq("tenant_id", tenantId).limit(2);
    if (empresas?.length === 1) empresaId = empresas[0].id;
  }

  const { data: number } = await supabase.rpc("next_erp_document_number", {
    p_tenant_id: tenantId,
    p_doc_type: "proposta",
    p_prefix: "PROP",
  });
  if (!number) return { error: "Não foi possível gerar o número da proposta" };

  const { data: proposta, error } = await supabase
    .from("erp_propostas")
    .insert({
      tenant_id: tenantId,
      number,
      contact_id: contactId,
      seller_id: sellerId,
      source: opts.source,
      valid_until: opts.validUntil || null,
      payment_term: opts.paymentTerm || null,
      freight_type: opts.freightType ?? "CIF",
      carrier_id: carrierId,
      freight_cents: opts.freightCents ?? 0,
      discount_cents: opts.discountCents ?? 0,
      notes: opts.notes || null,
      created_by: opts.createdBy ?? null,
      empresa_id: empresaId,
    })
    .select("*")
    .single();
  if (error || !proposta) return { error: `Não foi possível criar a proposta: ${error?.message ?? "erro desconhecido"}` };

  const { error: itensError } = await supabase
    .from("erp_proposta_itens")
    .insert(resolvedItems.map((i) => ({ ...i, tenant_id: tenantId, proposta_id: proposta.id })));
  if (itensError) {
    await supabase.from("erp_propostas").delete().eq("id", proposta.id);
    return { error: `Não foi possível salvar os itens: ${itensError.message}` };
  }

  if (opts.source === "sdr" && sellerId) {
    const slug = await getTenantSlug(supabase, tenantId);
    await supabase.from("erp_notificacoes").insert({
      tenant_id: tenantId,
      profile_id: sellerId,
      message: `O SDR montou a proposta ${number}, pronta pra revisão.`,
      link: slug ? `/${slug}/erp/vendas/propostas/${proposta.id}` : null,
    });
    await supabase.from("activities").insert({
      tenant_id: tenantId,
      contact_id: contactId,
      type: "note",
      direction: "outbound",
      body: `SDR montou a proposta ${number} automaticamente — aguardando revisão do vendedor.`,
    });
  }

  return { proposta };
}
