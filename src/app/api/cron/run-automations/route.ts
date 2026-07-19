import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";
import { notifyJobFailure } from "@/lib/discord/notify";

const BATCH_SIZE = 20;

type LeadWebhookWelcomePayload = { contactId: string; phone: string; message: string };

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
      if (job.job_type === "lead_webhook_welcome") {
        const payload = job.payload as LeadWebhookWelcomePayload;
        const result = await sendWhatsAppMessage(job.tenant_id, payload.phone, payload.message);

        // sent_by null = mensagem automática, mesmo padrão do envio do SDR
        // de IA (runSdrLeadTurn.ts) — sem isso a mensagem chega no WhatsApp
        // do lead mas some do histórico dentro do CRM.
        const { data: waMessage } = await admin
          .from("whatsapp_messages")
          .insert({
            tenant_id: job.tenant_id,
            contact_id: payload.contactId,
            twilio_sid: result.externalId,
            direction: "outbound",
            from_number: result.from,
            to_number: result.to,
            body: payload.message,
            status: result.initialStatus,
            sent_by: null,
          })
          .select("id")
          .single();

        await admin.from("activities").insert({
          tenant_id: job.tenant_id,
          contact_id: payload.contactId,
          type: "whatsapp",
          direction: "outbound",
          body: payload.message,
          created_by: null,
          whatsapp_message_id: waMessage?.id ?? null,
        });
      } else {
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
