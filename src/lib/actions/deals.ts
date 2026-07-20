"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { createBlingOrderForDeal } from "@/lib/bling/sync";
import { createDealWonInboxEntry } from "@/lib/financas/crmInbox";
import { dealSchema, updateDealStageSchema } from "@/lib/validation/deal";

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

  if (stage?.is_won && previousDeal && previousDeal.status !== "won") {
    void createDealWonInboxEntry(previousDeal.tenant_id, parsed.data.dealId, previousDeal.title, Number(previousDeal.value));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: deal } = await supabase
    .from("deals")
    .select("contact_id")
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

  revalidatePath("/[tenantSlug]/pipeline", "page");
  revalidatePath("/[tenantSlug]/dashboard", "page");
  if (deal) {
    revalidatePath(`/[tenantSlug]/contacts/${deal.contact_id}`, "page");
    revalidatePath(`/[tenantSlug]/whatsapp/${deal.contact_id}`, "page");
  }

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
    .select("tenant_id, title, value, contact_id, contact:contacts(bling_contact_id)")
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
