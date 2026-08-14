"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId, getTenantSlug } from "@/lib/auth/current-user";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";
import { erpPropostaSchema } from "@/lib/validation/erp-propostas";
import { createErpPropostaCore } from "@/lib/erp/propostaCore";
import { formatCurrency } from "@/lib/utils/currency";
import type { ErpProposta, ErpPropostaItem } from "@/types/domain";

export type ActionState = { error?: string } | null;

type DbClient = Awaited<ReturnType<typeof createClient>>;

async function currentTenant() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, tenantId: null };
  const tenantId = await requireTenantId(supabase, user.id);
  return { supabase, user, tenantId };
}

async function revalidateErpPropostas(supabase: DbClient, tenantId: string, propostaId?: string) {
  const slug = await getTenantSlug(supabase, tenantId);
  if (!slug) return;
  revalidatePath(`/${slug}/erp/vendas/propostas`);
  if (propostaId) revalidatePath(`/${slug}/erp/vendas/propostas/${propostaId}`);
}

export type ErpPropostaWithRelations = ErpProposta & {
  contact: { id: string; name: string; phone: string | null } | null;
  seller: { id: string; full_name: string | null } | null;
  empresa: { id: string; name: string; cnpj: string; regime_tributario: string } | null;
  itens: ErpPropostaItem[];
};

const SELECT_WITH_RELATIONS =
  "*, contact:contacts(id,name,phone), seller:profiles(id,full_name), empresa:erp_empresas(id,name,cnpj,regime_tributario), itens:erp_proposta_itens(*)";

export async function getErpPropostas(): Promise<ErpPropostaWithRelations[]> {
  const { supabase, tenantId } = await currentTenant();
  if (!tenantId) return [];
  const { data } = await supabase
    .from("erp_propostas")
    .select(SELECT_WITH_RELATIONS)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as ErpPropostaWithRelations[];
}

export async function getErpPropostaById(id: string): Promise<ErpPropostaWithRelations | null> {
  const { supabase, tenantId } = await currentTenant();
  if (!tenantId) return null;
  const { data } = await supabase
    .from("erp_propostas")
    .select(SELECT_WITH_RELATIONS)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return (data as unknown as ErpPropostaWithRelations) ?? null;
}

/** Uso manual — tela /erp/vendas/propostas/nova. Redireciona pro detalhe ao criar. */
export async function createErpProposta(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const raw = formData.get("items");
  let items: unknown[] = [];
  try {
    items = raw ? JSON.parse(String(raw)) : [];
  } catch {
    return { error: "Itens inválidos" };
  }

  const parsed = erpPropostaSchema.safeParse({
    contactId: formData.get("contactId"),
    empresaId: formData.get("empresaId"),
    sellerId: formData.get("sellerId"),
    validUntil: formData.get("validUntil"),
    paymentTerm: formData.get("paymentTerm"),
    freightType: formData.get("freightType"),
    carrierId: formData.get("carrierId"),
    freightReais: formData.get("freightReais"),
    discountReais: formData.get("discountReais"),
    notes: formData.get("notes"),
    items,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { supabase, user, tenantId } = await currentTenant();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: hasErp } = await supabase.rpc("current_tenant_has_erp", { p_user_id: user.id });
  if (!hasErp) return { error: "ERP não está ativo pra este tenant" };

  const result = await createErpPropostaCore(
    supabase,
    tenantId,
    parsed.data.contactId,
    parsed.data.items.map((i) => ({
      produtoId: i.produtoId,
      quantity: i.quantity,
      unitPriceCents: i.unitPriceReais !== undefined ? Math.round(i.unitPriceReais * 100) : undefined,
      discountPct: i.discountPct,
    })),
    {
      source: "manual",
      sellerId: parsed.data.sellerId || null,
      empresaId: parsed.data.empresaId || null,
      createdBy: user.id,
      validUntil: parsed.data.validUntil || null,
      paymentTerm: parsed.data.paymentTerm || null,
      freightType: parsed.data.freightType,
      carrierId: parsed.data.carrierId || null,
      freightCents: parsed.data.freightReais !== undefined ? Math.round(parsed.data.freightReais * 100) : 0,
      discountCents: parsed.data.discountReais !== undefined ? Math.round(parsed.data.discountReais * 100) : 0,
      notes: parsed.data.notes || null,
    },
  );
  if (result.error || !result.proposta) return { error: result.error ?? "Não foi possível criar a proposta" };

  await revalidateErpPropostas(supabase, tenantId);
  const slug = await getTenantSlug(supabase, tenantId);
  redirect(`/${slug}/erp/vendas/propostas/${result.proposta.id}`);
}

export async function updateErpPropostaStatus(id: string, status: string): Promise<{ error?: string }> {
  const { supabase, user, tenantId } = await currentTenant();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: hasErp } = await supabase.rpc("current_tenant_has_erp", { p_user_id: user.id });
  if (!hasErp) return { error: "ERP não está ativo pra este tenant" };

  const proposta = await getErpPropostaById(id);
  if (!proposta) return { error: "Proposta não encontrada" };

  // "Aprovar e enviar" dispara o envio de verdade — as outras transições
  // (negociação, aprovada, recusada etc.) só mudam o status.
  if (status === "enviada" && proposta.contact?.phone) {
    const subtotal = proposta.itens.reduce((s, i) => s + i.unit_price_cents * i.quantity * (1 - i.discount_pct / 100), 0);
    const total = subtotal + proposta.freight_cents - proposta.discount_cents;
    const linhas = proposta.itens
      .map((i) => `• ${i.quantity}x ${i.product_name_snapshot} — ${formatCurrency(i.unit_price_cents / 100)}`)
      .join("\n");
    const resumo =
      `Olá! Segue a proposta ${proposta.number}:\n\n${linhas}\n\n` +
      `Total: ${formatCurrency(total / 100)}` +
      (proposta.valid_until ? `\nVálida até ${new Date(proposta.valid_until).toLocaleDateString("pt-BR")}` : "");

    try {
      const result = await sendWhatsAppMessage(tenantId, proposta.contact.phone, resumo);
      const { data: waMessage } = await supabase
        .from("whatsapp_messages")
        .insert({
          tenant_id: tenantId,
          contact_id: proposta.contact.id,
          twilio_sid: result.externalId,
          direction: "outbound",
          from_number: result.from,
          to_number: result.to,
          body: resumo,
          status: result.initialStatus,
          sent_by: user.id,
        })
        .select("id")
        .single();
      await supabase.from("activities").insert({
        tenant_id: tenantId,
        contact_id: proposta.contact.id,
        type: "whatsapp",
        direction: "outbound",
        body: resumo,
        created_by: user.id,
        whatsapp_message_id: waMessage?.id ?? null,
      });
    } catch (err) {
      return { error: err instanceof Error ? `Não foi possível enviar: ${err.message}` : "Não foi possível enviar a proposta" };
    }
  }

  const { error } = await supabase.from("erp_propostas").update({ status }).eq("id", id).eq("tenant_id", tenantId);
  if (error) return { error: `Não foi possível atualizar o status: ${error.message}` };

  await revalidateErpPropostas(supabase, tenantId, id);
  return {};
}

export async function deleteErpProposta(id: string): Promise<{ error?: string }> {
  const { supabase, user, tenantId } = await currentTenant();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: hasErp } = await supabase.rpc("current_tenant_has_erp", { p_user_id: user.id });
  if (!hasErp) return { error: "ERP não está ativo pra este tenant" };

  const { error } = await supabase.from("erp_propostas").delete().eq("id", id).eq("tenant_id", tenantId);
  if (error) return { error: `Não foi possível excluir: ${error.message}` };

  await revalidateErpPropostas(supabase, tenantId);
  return {};
}
