import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppMessage, type SendResult } from "@/lib/whatsapp/send";
import { notifyJobFailure } from "@/lib/discord/notify";
import {
  getFunnelSettings,
  renderTemplate,
  applyTagToContact,
  moveDealToStageByName,
} from "@/lib/automations/funnel";
import { runKommoImportStep } from "@/lib/kommo/import";

const BATCH_SIZE = 20;

type Admin = ReturnType<typeof createAdminClient>;

type LeadWebhookWelcomePayload = { contactId: string; phone: string; message: string };
type ProposalFollowupPayload = { dealId: string };
type InactiveCheckPayload = { dealId: string; followupSentAt: string };
type DealWonMessagePayload = { dealId: string; contactId: string; phone: string; message: string };
type KommoImportPagePayload = { importId: string };

/**
 * Registra no CRM uma mensagem enviada automaticamente (sent_by/created_by
 * null = automação, mesmo padrão do envio do SDR de IA). Sem isso a mensagem
 * chega no WhatsApp do lead mas some do histórico dentro do CRM.
 */
async function recordOutboundMessage(
  admin: Admin,
  tenantId: string,
  contactId: string,
  message: string,
  result: SendResult,
): Promise<void> {
  const { data: waMessage } = await admin
    .from("whatsapp_messages")
    .insert({
      tenant_id: tenantId,
      contact_id: contactId,
      twilio_sid: result.externalId,
      direction: "outbound",
      from_number: result.from,
      to_number: result.to,
      body: message,
      status: result.initialStatus,
      sent_by: null,
    })
    .select("id")
    .single();

  await admin.from("activities").insert({
    tenant_id: tenantId,
    contact_id: contactId,
    type: "whatsapp",
    direction: "outbound",
    body: message,
    created_by: null,
    whatsapp_message_id: waMessage?.id ?? null,
  });
}

async function handleLeadWebhookWelcome(admin: Admin, tenantId: string, payload: LeadWebhookWelcomePayload) {
  const result = await sendWhatsAppMessage(tenantId, payload.phone, payload.message);
  await recordOutboundMessage(admin, tenantId, payload.contactId, payload.message, result);
}

/**
 * Follow-up de proposta: X horas depois de a proposta ser marcada como
 * enviada. Se o negócio já saiu de "Proposta" (fechou ou avançou na mão),
 * não faz nada. Caso contrário: envia a mensagem, aplica a tag de fechamento,
 * move pra "Fechamento" e agenda a checagem de inatividade.
 */
async function handleProposalFollowup(admin: Admin, payload: ProposalFollowupPayload) {
  const { data: deal } = await admin
    .from("deals")
    .select("id, tenant_id, contact_id, status, stage:pipeline_stages(name), contact:contacts(name, phone)")
    .eq("id", payload.dealId)
    .maybeSingle();

  if (!deal || deal.status !== "open") return;
  const stageName = (deal.stage?.name ?? "").toLowerCase();
  if (!stageName.includes("proposta")) return;
  if (!deal.contact?.phone) return;

  const settings = await getFunnelSettings(admin, deal.tenant_id);
  const message = renderTemplate(settings.followup_message, deal.contact.name);
  const result = await sendWhatsAppMessage(deal.tenant_id, deal.contact.phone, message);
  await recordOutboundMessage(admin, deal.tenant_id, deal.contact_id, message, result);

  await applyTagToContact(admin, deal.tenant_id, deal.contact_id, settings.followup_tag_name);
  await moveDealToStageByName(admin, deal.tenant_id, deal.id, deal.contact_id, "Fechamento");

  const runAt = new Date(Date.now() + settings.inactive_delay_hours * 60 * 60 * 1000).toISOString();
  await admin.from("automation_jobs").insert({
    tenant_id: deal.tenant_id,
    job_type: "inactive_check",
    run_at: runAt,
    payload: { dealId: deal.id, followupSentAt: new Date().toISOString() },
  });
}

/**
 * Checagem de inatividade: X horas após o follow-up. Se o lead respondeu
 * (qualquer mensagem inbound depois do follow-up), fica em "Fechamento".
 * Senão, move pra "Inativo" com a tag correspondente. Só age se o negócio
 * ainda estiver aberto e parado em "Fechamento".
 */
async function handleInactiveCheck(admin: Admin, payload: InactiveCheckPayload) {
  const { data: deal } = await admin
    .from("deals")
    .select("id, tenant_id, contact_id, status, stage:pipeline_stages(name)")
    .eq("id", payload.dealId)
    .maybeSingle();

  if (!deal || deal.status !== "open") return;
  if (!(deal.stage?.name ?? "").toLowerCase().includes("fechamento")) return;

  const { count } = await admin
    .from("whatsapp_messages")
    .select("id", { count: "exact", head: true })
    .eq("contact_id", deal.contact_id)
    .eq("direction", "inbound")
    .gt("created_at", payload.followupSentAt);

  if ((count ?? 0) > 0) return; // respondeu — permanece em Fechamento

  const settings = await getFunnelSettings(admin, deal.tenant_id);
  await applyTagToContact(admin, deal.tenant_id, deal.contact_id, settings.inactive_tag_name, "#64748b");
  await moveDealToStageByName(admin, deal.tenant_id, deal.id, deal.contact_id, "Inativo");
}

async function handleDealWonMessage(admin: Admin, tenantId: string, payload: DealWonMessagePayload) {
  const result = await sendWhatsAppMessage(tenantId, payload.phone, payload.message);
  await recordOutboundMessage(admin, tenantId, payload.contactId, payload.message, result);
}

/**
 * Processa a fila de automation_jobs — chamado a cada poucos minutos por um
 * cron externo na VPS (mesmo padrão de x-cron-secret de billing-cycle, só
 * que com frequência bem maior: follow-up/boas-vindas não podem esperar um
 * dia). Um job por vez, sequencial — volume baixo por enquanto, não precisa
 * de paralelismo ainda.
 */
export async function POST(request: Request) {
  const cronSecret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: jobs } = await admin
    .from("automation_jobs")
    .select("id, tenant_id, job_type, payload, attempts")
    .eq("status", "pending")
    .lte("run_at", now)
    .order("run_at", { ascending: true })
    .limit(BATCH_SIZE);

  let done = 0;
  let failed = 0;

  for (const job of jobs ?? []) {
    await admin.from("automation_jobs").update({ status: "processing" }).eq("id", job.id);

    try {
      switch (job.job_type) {
        case "lead_webhook_welcome":
          await handleLeadWebhookWelcome(admin, job.tenant_id, job.payload as LeadWebhookWelcomePayload);
          break;
        case "proposal_followup":
          await handleProposalFollowup(admin, job.payload as ProposalFollowupPayload);
          break;
        case "inactive_check":
          await handleInactiveCheck(admin, job.payload as InactiveCheckPayload);
          break;
        case "deal_won_message":
          await handleDealWonMessage(admin, job.tenant_id, job.payload as DealWonMessagePayload);
          break;
        // Uma página da importação do Kommo. O próprio passo agenda o
        // seguinte, então a fila avança sozinha até acabar (ver kommo/import).
        case "kommo_import_page":
          await runKommoImportStep(admin, (job.payload as KommoImportPagePayload).importId);
          break;
        default:
          throw new Error(`job_type desconhecido: ${job.job_type}`);
      }

      await admin
        .from("automation_jobs")
        .update({ status: "done", processed_at: new Date().toISOString() })
        .eq("id", job.id);
      done++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      await admin
        .from("automation_jobs")
        .update({
          status: "failed",
          attempts: job.attempts + 1,
          error: message,
          processed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      failed++;
      console.error("run-automations: job falhou", job.id, job.job_type, message);
      void notifyJobFailure(job.job_type, job.tenant_id, message);
    }
  }

  return NextResponse.json({ processed: jobs?.length ?? 0, done, failed });
}
