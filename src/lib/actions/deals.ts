"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantId } from "@/lib/auth/current-user";
import {
  scheduleProposalFollowup,
  cancelFunnelJobs,
  enqueueDealWonMessage,
  getFunnelSettings,
} from "@/lib/automations/funnel";
import { triggerFlows } from "@/lib/automations/runtime";
import { createBlingOrderForDeal } from "@/lib/bling/sync";
import { createDealWonInboxEntry } from "@/lib/financas/crmInbox";
import { baixarEstoqueVenda } from "@/lib/estoque/dealStock";
import { CRM_MODULE_COUPLING } from "@/lib/crm/isolation";
import { dealSchema, updateDealOwnerSchema, updateDealStageSchema } from "@/lib/validation/deal";

export type ActionState = { error?: string } | null;

export async function createDeal(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = dealSchema.safeParse({
    title: formData.get("title"),
    contactId: formData.get("contactId"),
    stageId: formData.get("stageId"),
    value: formData.get("value"),
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
  if (!tenantId) return { error: "Tenant não encontrado para este usuário" };

  const { count } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("stage_id", parsed.data.stageId);

  const { error } = await supabase.from("deals").insert({
    tenant_id: tenantId,
    title: parsed.data.title,
    contact_id: parsed.data.contactId,
    stage_id: parsed.data.stageId,
    value: parsed.data.value,
    owner_id: user.id,
    position: count ?? 0,
  });

  if (error) {
    return { error: "Não foi possível criar o negócio" };
  }

  revalidatePath("/[tenantSlug]/pipeline", "page");
  revalidatePath("/[tenantSlug]/dashboard", "page");
  revalidatePath(`/[tenantSlug]/contacts/${parsed.data.contactId}`, "page");
  revalidatePath(`/[tenantSlug]/whatsapp/${parsed.data.contactId}`, "page");
  return null;
}

/**
 * Cria o negócio do contato direto num estágio escolhido — usado pelo
 * carrossel de estágio nos Dados do contato quando o contato ainda não tem
 * nenhum negócio (ver ContactStageCarousel). owner_id é sempre quem está
 * clicando: a policy de insert de deals exige owner_id = auth.uid(), sem
 * bypass de admin.
 */
export async function createDealAtStage(contactId: string, stageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado para este usuário" };

  const { data: contact } = await supabase.from("contacts").select("name").eq("id", contactId).single();

  const { count } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("stage_id", stageId);

  const { data: created, error } = await supabase
    .from("deals")
    .insert({
      tenant_id: tenantId,
      title: `Lead — ${contact?.name ?? "Novo"}`,
      contact_id: contactId,
      stage_id: stageId,
      value: 0,
      owner_id: user.id,
      position: count ?? 0,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { error: "Não foi possível criar o negócio" };
  }

  revalidatePath("/[tenantSlug]/pipeline", "page");
  revalidatePath("/[tenantSlug]/dashboard", "page");
  revalidatePath(`/[tenantSlug]/contacts/${contactId}`, "page");
  revalidatePath(`/[tenantSlug]/whatsapp/${contactId}`, "page");
  return { dealId: created.id };
}

export async function updateDealStage(input: {
  dealId: string;
  stageId: string;
  position: number;
}) {
  const parsed = updateDealStageSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Dados inválidos" };
  }

  const supabase = await createClient();

  const { data: stage } = await supabase
    .from("pipeline_stages")
    .select("name, is_won, is_lost")
    .eq("id", parsed.data.stageId)
    .single();

  const closingNow = stage?.is_won || stage?.is_lost;

  const { data: previousDeal } = await supabase
    .from("deals")
    .select("status, tenant_id, title, value")
    .eq("id", parsed.data.dealId)
    .single();

  const { error } = await supabase
    .from("deals")
    .update({
      stage_id: parsed.data.stageId,
      position: parsed.data.position,
      status: stage?.is_won ? "won" : stage?.is_lost ? "lost" : "open",
      closed_at: closingNow ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.dealId);

  if (error) {
    return { error: "Não foi possível mover o negócio (você só move negócios que é o dono)" };
  }

  const justWon = Boolean(stage?.is_won && previousDeal && previousDeal.status !== "won");

  // Acoplamento com financeiro/estoque desligado enquanto o CRM está isolado
  // (ver src/lib/crm/isolation.ts) — o código continua aqui pra religar depois.
  if (justWon && previousDeal) {
    if (CRM_MODULE_COUPLING.financas)
      void createDealWonInboxEntry(previousDeal.tenant_id, parsed.data.dealId, previousDeal.title, Number(previousDeal.value));
    if (CRM_MODULE_COUPLING.estoque)
      void baixarEstoqueVenda(previousDeal.tenant_id, parsed.data.dealId, previousDeal.title);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: deal } = await supabase
    .from("deals")
    .select<{ contact_id: string; contact: { name: string; phone: string | null } | null }>(
      "contact_id, contact:contacts(name, phone)",
    )
    .eq("id", parsed.data.dealId)
    .single();

  const tenantId = user ? await requireTenantId(supabase, user.id) : null;

  if (deal && tenantId) {
    await supabase.from("activities").insert({
      tenant_id: tenantId,
      contact_id: deal.contact_id,
      deal_id: parsed.data.dealId,
      type: "stage_change",
      body: `Negócio movido para "${stage?.name ?? "novo estágio"}"`,
      created_by: user?.id ?? null,
    });
  }

  // ── Automações de funil (ver src/lib/automations/funnel.ts) ──────────────
  const automationTenantId = previousDeal?.tenant_id ?? tenantId;
  if (automationTenantId && deal) {
    const admin = createAdminClient();
    if (stage?.is_won || stage?.is_lost) {
      // Negócio fechado (ganho/perdido): cancela follow-up/inatividade pendentes.
      void cancelFunnelJobs(admin, parsed.data.dealId);

      // Mensagem automática de venda ganha.
      if (justWon && deal.contact?.phone) {
        void getFunnelSettings(admin, automationTenantId).then((settings) => {
          if (settings.won_message_enabled && deal.contact?.phone) {
            return enqueueDealWonMessage(
              admin,
              automationTenantId,
              parsed.data.dealId,
              deal.contact_id,
              deal.contact.phone,
              settings.won_message,
            );
          }
        });
      }
    } else if ((stage?.name ?? "").toLowerCase().includes("proposta")) {
      // Entrou (ou foi arrastado) para "Proposta": agenda/reinicia o follow-up.
      void scheduleProposalFollowup(admin, automationTenantId, parsed.data.dealId);
    }

    // Trajetórias que escutam "mudou de etapa" (ver automations/runtime).
    // Vale pra qualquer etapa, inclusive as de fechamento.
    void triggerFlows(admin, automationTenantId, "stage_changed", {
      contactId: deal.contact_id,
      dealId: parsed.data.dealId,
      stageId: parsed.data.stageId,
    });
  }

  revalidatePath("/[tenantSlug]/pipeline", "page");
  revalidatePath("/[tenantSlug]/dashboard", "page");
  if (deal) {
    revalidatePath(`/[tenantSlug]/contacts/${deal.contact_id}`, "page");
    revalidatePath(`/[tenantSlug]/whatsapp/${deal.contact_id}`, "page");
  }

  return { error: undefined };
}

/** Reatribui o vendedor responsável pelo negócio — só o dono/gerente pode mudar pra outra pessoa (RLS). */
export async function updateDealOwner(input: { dealId: string; ownerId: string }) {
  const parsed = updateDealOwnerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Dados inválidos" };
  }

  const supabase = await createClient();

  const { data: deal, error } = await supabase
    .from("deals")
    .update({ owner_id: parsed.data.ownerId })
    .eq("id", parsed.data.dealId)
    .select("contact_id")
    .single();

  if (error || !deal) {
    return { error: "Não foi possível reatribuir o negócio (só o dono da conta pode mudar o vendedor)" };
  }

  revalidatePath("/[tenantSlug]/pipeline", "page");
  revalidatePath(`/[tenantSlug]/contacts/${deal.contact_id}`, "page");
  revalidatePath(`/[tenantSlug]/whatsapp/${deal.contact_id}`, "page");
  return { error: undefined };
}

export async function deleteDeal(dealId: string) {
  const supabase = await createClient();
  await supabase.from("deals").delete().eq("id", dealId);
  revalidatePath("/[tenantSlug]/pipeline", "page");
  revalidatePath("/[tenantSlug]/dashboard", "page");
}

/**
 * Cria ou atualiza o valor do negócio "ativo" (mais recente) de um contato —
 * usado pelo painel rápido de orçamento na tela de conversa do WhatsApp, onde
 * o vendedor não quer sair da conversa pra abrir o pipeline.
 */
export async function setDealBudget(contactId: string, dealId: string | null, value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return { error: "Valor inválido" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  if (dealId) {
    const { error } = await supabase.from("deals").update({ value }).eq("id", dealId);
    if (error) return { error: "Não foi possível salvar o orçamento" };

    revalidatePath(`/[tenantSlug]/whatsapp/${contactId}`, "page");
    revalidatePath(`/[tenantSlug]/contacts/${contactId}`, "page");
    revalidatePath("/[tenantSlug]/pipeline", "page");
    revalidatePath("/[tenantSlug]/dashboard", "page");
    return { dealId };
  }

  const [{ data: firstStage, error: stageError }, { data: contact }] = await Promise.all([
    supabase.from("pipeline_stages").select("id").order("position", { ascending: true }).limit(1).single(),
    supabase.from("contacts").select("name").eq("id", contactId).single(),
  ]);

  if (!firstStage) {
    console.error("setDealBudget: falha ao buscar estágio inicial", stageError);
    return { error: `Nenhum estágio de pipeline configurado: ${stageError?.message ?? "erro desconhecido"}` };
  }

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado para este usuário" };

  const { data: created, error } = await supabase
    .from("deals")
    .insert({
      tenant_id: tenantId,
      title: `Orçamento — ${contact?.name ?? "Lead"}`,
      contact_id: contactId,
      stage_id: firstStage.id,
      value,
      owner_id: user.id,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("setDealBudget: falha ao criar negócio", error);
    return { error: `Não foi possível criar o orçamento: ${error?.message ?? "erro desconhecido"}` };
  }

  revalidatePath(`/[tenantSlug]/whatsapp/${contactId}`, "page");
  revalidatePath(`/[tenantSlug]/contacts/${contactId}`, "page");
  revalidatePath("/[tenantSlug]/pipeline", "page");
  revalidatePath("/[tenantSlug]/dashboard", "page");
  return { dealId: created.id };
}

/**
 * Marca que a proposta foi enviada ao contato. Também move o negócio pro
 * estágio "Proposta" no pipeline (se existir um estágio com esse nome) —
 * assim o quadro Kanban reflete sozinho quem já recebeu proposta, sem
 * precisar arrastar manualmente. Leads sem proposta enviada e sem venda
 * ficam sempre no primeiro estágio ("Novo"), já que é lá que todo negócio
 * novo é criado por padrão.
 */
export async function markProposalSent(dealId: string) {
  const supabase = await createClient();

  const { data: proposalStage } = await supabase
    .from("pipeline_stages")
    .select("id")
    .ilike("name", "%proposta%")
    .limit(1)
    .maybeSingle();

  const { data: deal, error } = await supabase
    .from("deals")
    .update({
      proposal_sent_at: new Date().toISOString(),
      ...(proposalStage ? { stage_id: proposalStage.id } : {}),
    })
    .eq("id", dealId)
    .select<{
      tenant_id: string;
      title: string;
      value: number;
      contact_id: string;
      contact: { bling_contact_id: string | null } | null;
    }>("tenant_id, title, value, contact_id, contact:contacts(bling_contact_id)")
    .single();

  if (error || !deal) {
    return { error: "Não foi possível marcar a proposta como enviada" };
  }

  if (deal.contact?.bling_contact_id) {
    void createBlingOrderForDeal(
      deal.tenant_id,
      { id: dealId, title: deal.title, value: Number(deal.value), contactId: deal.contact_id },
      deal.contact.bling_contact_id,
    );
  }

  // Agenda o follow-up de proposta (ver src/lib/automations/funnel.ts).
  void scheduleProposalFollowup(createAdminClient(), deal.tenant_id, dealId);

  revalidatePath("/[tenantSlug]/pipeline", "page");
  revalidatePath(`/[tenantSlug]/whatsapp/${deal.contact_id}`, "page");
  revalidatePath(`/[tenantSlug]/contacts/${deal.contact_id}`, "page");
  revalidatePath("/[tenantSlug]/dashboard", "page");
  return { error: undefined };
}

/** Marca o negócio como venda ganha — move pro estágio "ganho" do pipeline (ex: Fechado). */
export async function markDealWon(dealId: string) {
  const supabase = await createClient();

  const { data: wonStage } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("is_won", true)
    .limit(1)
    .maybeSingle();

  if (!wonStage) return { error: "Nenhum estágio de 'ganho' configurado no pipeline" };

  const { count } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("stage_id", wonStage.id);

  return updateDealStage({ dealId, stageId: wonStage.id, position: count ?? 0 });
}
