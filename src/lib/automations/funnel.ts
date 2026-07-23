import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Automações de funil (Fase 1). Tudo aqui roda com a service role (admin
 * client): o agendamento é chamado de dentro das server actions de deals e o
 * disparo vem do cron run-automations. A fila em si é automation_jobs
 * (ver 0046_automation_core) — aqui só empilhamos/cancelamos jobs e aplicamos
 * os efeitos (tag + mudança de etapa).
 */

export type FunnelAutomationSettings = {
  enabled: boolean;
  followup_delay_hours: number;
  followup_message: string;
  followup_tag_name: string;
  inactive_delay_hours: number;
  inactive_tag_name: string;
  won_message_enabled: boolean;
  won_message: string;
};

// Mesmos defaults dos column DEFAULTs em 0064_funnel_automation.sql — usados
// quando o tenant ainda não tem registro em funnel_automation_settings.
export const FUNNEL_DEFAULTS: FunnelAutomationSettings = {
  enabled: true,
  followup_delay_hours: 48,
  followup_message:
    "Olá {nome}! Passando pra saber se você conseguiu analisar nossa proposta. Posso te ajudar com alguma dúvida pra seguirmos com o fechamento? 😊",
  followup_tag_name: "Follow UP de fechamento",
  inactive_delay_hours: 12,
  inactive_tag_name: "Cliente inativo",
  won_message_enabled: true,
  won_message: "Pedido recebido e encaminhado para produção, obrigado pela preferência!",
};

export async function getFunnelSettings(admin: Admin, tenantId: string): Promise<FunnelAutomationSettings> {
  const { data } = await admin
    .from("funnel_automation_settings")
    .select(
      "enabled, followup_delay_hours, followup_message, followup_tag_name, inactive_delay_hours, inactive_tag_name, won_message_enabled, won_message",
    )
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return data ? { ...FUNNEL_DEFAULTS, ...data } : FUNNEL_DEFAULTS;
}

/** Aplica o texto de mensagem substituindo {nome} pelo primeiro nome do contato. */
export function renderTemplate(template: string, contactName: string | null): string {
  const firstName = (contactName ?? "").trim().split(/\s+/)[0] || "";
  return template.replaceAll("{nome}", firstName);
}

/** Encontra uma etapa do pipeline pelo nome (case-insensitive) dentro do tenant. */
export async function findStageByName(
  admin: Admin,
  tenantId: string,
  name: string,
): Promise<{ id: string; name: string } | null> {
  const { data } = await admin
    .from("pipeline_stages")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .ilike("name", name)
    .order("position")
    .limit(1)
    .maybeSingle();
  return data;
}

/** Garante que a tag existe no tenant (cria se preciso) e a associa ao contato. */
export async function applyTagToContact(
  admin: Admin,
  tenantId: string,
  contactId: string,
  tagName: string,
  color = "#a855f7",
): Promise<void> {
  const { data: existing } = await admin
    .from("tags")
    .select("id")
    .eq("tenant_id", tenantId)
    .ilike("name", tagName)
    .limit(1)
    .maybeSingle();

  let tagId = existing?.id ?? null;
  if (!tagId) {
    const { data: created } = await admin
      .from("tags")
      .insert({ tenant_id: tenantId, name: tagName, color })
      .select("id")
      .single();
    tagId = created?.id ?? null;
  }
  if (!tagId) return;

  await admin
    .from("contact_tags")
    .upsert({ contact_id: contactId, tag_id: tagId, tenant_id: tenantId }, { onConflict: "contact_id,tag_id" });
}

/**
 * Move o negócio para uma etapa (pelo nome) e registra a atividade de
 * mudança. Fechamento/Inativo não são is_won/is_lost, então o status do
 * negócio continua "open" — só muda a coluna do Kanban.
 */
export async function moveDealToStageByName(
  admin: Admin,
  tenantId: string,
  dealId: string,
  contactId: string,
  stageName: string,
): Promise<boolean> {
  const stage = await findStageByName(admin, tenantId, stageName);
  if (!stage) return false;

  const { count } = await admin
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("stage_id", stage.id);

  const { error } = await admin
    .from("deals")
    .update({ stage_id: stage.id, position: count ?? 0 })
    .eq("id", dealId);
  if (error) return false;

  await admin.from("activities").insert({
    tenant_id: tenantId,
    contact_id: contactId,
    deal_id: dealId,
    type: "stage_change",
    body: `Negócio movido para "${stage.name}" (automação de funil)`,
    created_by: null,
  });
  return true;
}

/** Remove jobs de funil ainda pendentes para um negócio (ex: lead avançou/fechou). */
export async function cancelFunnelJobs(admin: Admin, dealId: string): Promise<void> {
  await admin
    .from("automation_jobs")
    .delete()
    .eq("status", "pending")
    .in("job_type", ["proposal_followup", "inactive_check"])
    .eq("payload->>dealId", dealId);
}

/**
 * Agenda (ou reagenda) o follow-up de proposta para um negócio. Chamado
 * sempre que o negócio entra na etapa "Proposta". Reseta o cronômetro: apaga
 * jobs de funil pendentes desse negócio antes de criar o novo.
 */
export async function scheduleProposalFollowup(admin: Admin, tenantId: string, dealId: string): Promise<void> {
  const settings = await getFunnelSettings(admin, tenantId);
  if (!settings.enabled) return;

  await cancelFunnelJobs(admin, dealId);

  const runAt = new Date(Date.now() + settings.followup_delay_hours * 60 * 60 * 1000).toISOString();
  await admin.from("automation_jobs").insert({
    tenant_id: tenantId,
    job_type: "proposal_followup",
    run_at: runAt,
    payload: { dealId },
  });
}

/**
 * Enfileira a mensagem de venda ganha (envio imediato pelo cron). Mantido na
 * fila em vez de enviar direto na server action pra herdar retry + logging de
 * falha do run-automations, igual ao follow-up.
 */
export async function enqueueDealWonMessage(
  admin: Admin,
  tenantId: string,
  dealId: string,
  contactId: string,
  phone: string,
  message: string,
): Promise<void> {
  await admin.from("automation_jobs").insert({
    tenant_id: tenantId,
    job_type: "deal_won_message",
    run_at: new Date().toISOString(),
    payload: { dealId, contactId, phone, message },
  });
}
