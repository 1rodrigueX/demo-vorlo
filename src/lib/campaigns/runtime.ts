import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";
import { recordOutboundMessage } from "@/lib/whatsapp/recordOutboundMessage";
import { msUntilSendWindow } from "@/lib/automations/runtime";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Motor dos disparos em massa.
 *
 * Tudo aqui existe pra proteger o número do cliente. Disparo mal feito no
 * WhatsApp resulta em ban, e com o ban vai o histórico de conversa inteiro —
 * um prejuízo bem maior que o da campanha não sair no horário. Por isso:
 * lotes pequenos, intervalo aleatório entre envios, janela de horário, teto
 * diário com aquecimento progressivo e freio automático quando a taxa de
 * erro sobe.
 */

/** Envios por rodada do cron. Baixo de propósito. */
const DEFAULT_BATCH_SIZE = 5;
const MAX_BATCH_SIZE = 15;
/** Intervalo aleatório entre um envio e o seguinte, dentro da mesma rodada. */
const MIN_GAP_MS = 3_000;
const MAX_GAP_MS = 9_000;
/** Teto diário padrão, se o dono não configurar. */
const DEFAULT_DAILY_CAP = 200;
/** Aquecimento: quanto o teto cresce por dia de uso. */
const WARMUP_DAILY_STEP = 50;
const WARMUP_CEILING = 1_000;
/** Acima disso numa rodada, a campanha pausa sozinha. */
const FAILURE_RATE_BRAKE = 0.5;

export type CampaignAudience = {
  stageIds?: string[];
  tagIds?: string[];
  ownerIds?: string[];
  onlyWithPhone?: boolean;
};

type CampaignRow = {
  id: string;
  tenant_id: string;
  message: string;
  variants: unknown;
  schedule: unknown;
  throttle: unknown;
  status: string;
};

/** Uma rodada de envios. Chamada pelo cron; reagenda a próxima sozinha. */
export async function runCampaignTick(admin: Admin, campaignId: string): Promise<void> {
  const { data: campaign } = await admin
    .from("campaigns")
    .select("id, tenant_id, message, variants, schedule, throttle, status")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign) return;
  if (campaign.status !== "scheduled" && campaign.status !== "running") return;

  const schedule = (campaign.schedule ?? {}) as { startAt?: string };
  const startAt = schedule.startAt ? new Date(schedule.startAt) : null;
  if (startAt && startAt.getTime() > Date.now()) {
    await enqueueCampaignTick(admin, campaign.tenant_id, campaign.id, startAt);
    return;
  }

  // Fora do horário permitido: volta quando abrir, sem enviar nada.
  const closedFor = msUntilSendWindow(new Date());
  if (closedFor > 0) {
    await enqueueCampaignTick(admin, campaign.tenant_id, campaign.id, new Date(Date.now() + closedFor));
    return;
  }

  const remainingToday = await remainingQuotaToday(admin, campaign);
  if (remainingToday <= 0) {
    // Teto do dia batido: volta amanhã na abertura da janela.
    await enqueueCampaignTick(admin, campaign.tenant_id, campaign.id, nextWindowOpening());
    return;
  }

  const batchSize = Math.min(resolveBatchSize(campaign), remainingToday);

  const { data: recipients } = await admin
    .from("campaign_recipients")
    .select("id, contact_id")
    .eq("campaign_id", campaign.id)
    .eq("status", "pending")
    .limit(batchSize);

  if (!recipients?.length) {
    await admin
      .from("campaigns")
      .update({ status: "done", finished_at: new Date().toISOString() })
      .eq("id", campaign.id);
    return;
  }

  if (campaign.status === "scheduled") {
    await admin
      .from("campaigns")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", campaign.id);
  }

  const messages = messageVariants(campaign);
  let attempted = 0;
  let failed = 0;

  for (const [index, recipient] of recipients.entries()) {
    // Intervalo aleatório: rajada de mensagens idênticas em intervalo exato é
    // o padrão que os sistemas antispam procuram.
    if (index > 0) await sleep(MIN_GAP_MS + Math.random() * (MAX_GAP_MS - MIN_GAP_MS));

    const outcome = await sendToRecipient(admin, campaign, recipient, messages);
    if (outcome === "attempted") attempted++;
    if (outcome === "failed") {
      attempted++;
      failed++;
    }
  }

  // Freio: se metade da rodada falhou, alguma coisa está errada (número
  // desconectado, sessão caída, bloqueio). Continuar só piora.
  if (attempted > 0 && failed / attempted >= FAILURE_RATE_BRAKE) {
    await admin
      .from("campaigns")
      .update({
        status: "paused",
        error: `Pausada automaticamente: ${failed} de ${attempted} envios falharam nesta rodada. Confira a conexão do WhatsApp antes de retomar.`,
      })
      .eq("id", campaign.id);
    return;
  }

  await enqueueCampaignTick(admin, campaign.tenant_id, campaign.id, new Date(Date.now() + 60_000));
}

type Recipient = { id: string; contact_id: string };

async function sendToRecipient(
  admin: Admin,
  campaign: CampaignRow,
  recipient: Recipient,
  messages: string[],
): Promise<"skipped" | "attempted" | "failed"> {
  const { data: contact } = await admin
    .from("contacts")
    .select("name, phone, opted_out_at")
    .eq("id", recipient.contact_id)
    .maybeSingle();

  if (!contact) {
    await markRecipient(admin, recipient.id, "skipped", "Contato não existe mais");
    return "skipped";
  }
  if (contact.opted_out_at) {
    await markRecipient(admin, recipient.id, "opted_out", "Lead pediu para não receber mensagens");
    return "skipped";
  }
  if (!contact.phone) {
    await markRecipient(admin, recipient.id, "skipped", "Contato sem telefone");
    return "skipped";
  }

  const template = messages[Math.floor(Math.random() * messages.length)];
  const message = template.replaceAll("{nome}", (contact.name ?? "").trim().split(/\s+/)[0] || "");

  try {
    const result = await sendWhatsAppMessage(campaign.tenant_id, contact.phone, message);
    await recordOutboundMessage(admin, campaign.tenant_id, recipient.contact_id, message, result);
    await markRecipient(admin, recipient.id, "sent");
    return "attempted";
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Erro desconhecido no envio";
    await markRecipient(admin, recipient.id, "failed", detail);
    return "failed";
  }
}

async function markRecipient(
  admin: Admin,
  recipientId: string,
  status: "sent" | "failed" | "skipped" | "opted_out",
  error?: string,
): Promise<void> {
  await admin
    .from("campaign_recipients")
    .update({ status, error: error ?? null, sent_at: status === "sent" ? new Date().toISOString() : null })
    .eq("id", recipientId);
}

export async function enqueueCampaignTick(
  admin: Admin,
  tenantId: string,
  campaignId: string,
  runAt: Date = new Date(),
): Promise<void> {
  await admin.from("automation_jobs").insert({
    tenant_id: tenantId,
    job_type: "campaign_tick",
    run_at: runAt.toISOString(),
    payload: { campaignId },
  });
}

/**
 * Quanto ainda pode sair hoje. Vale o menor entre o teto configurado e o teto
 * de aquecimento — um número novo que dispara 500 mensagens no primeiro dia é
 * candidato a ban, mesmo com todo o resto certo.
 */
async function remainingQuotaToday(admin: Admin, campaign: CampaignRow): Promise<number> {
  const throttle = (campaign.throttle ?? {}) as { dailyCap?: number };
  const configured = Number(throttle.dailyCap);
  const cap = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_DAILY_CAP;

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [{ count: sentToday }, { data: firstEver }] = await Promise.all([
    admin
      .from("campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", campaign.tenant_id)
      .eq("status", "sent")
      .gte("sent_at", startOfDay.toISOString()),
    admin
      .from("campaign_recipients")
      .select("sent_at")
      .eq("tenant_id", campaign.tenant_id)
      .eq("status", "sent")
      .order("sent_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const daysWarmed = firstEver?.sent_at
    ? Math.floor((Date.now() - new Date(firstEver.sent_at).getTime()) / 86_400_000)
    : 0;
  const warmupCap = Math.min(WARMUP_DAILY_STEP * (daysWarmed + 1), WARMUP_CEILING);

  return Math.min(cap, warmupCap) - (sentToday ?? 0);
}

function resolveBatchSize(campaign: CampaignRow): number {
  const throttle = (campaign.throttle ?? {}) as { batchSize?: number };
  const configured = Number(throttle.batchSize);
  if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_BATCH_SIZE;
  return Math.min(Math.round(configured), MAX_BATCH_SIZE);
}

function messageVariants(campaign: CampaignRow): string[] {
  const extra = Array.isArray(campaign.variants)
    ? campaign.variants.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];
  return [campaign.message, ...extra];
}

/** Próxima abertura da janela de envio (usa a mesma regra das trajetórias). */
function nextWindowOpening(): Date {
  const tomorrow = new Date(Date.now() + 86_400_000);
  return new Date(tomorrow.getTime() + msUntilSendWindow(tomorrow));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
