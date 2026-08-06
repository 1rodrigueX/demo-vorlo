import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SendResult } from "@/lib/whatsapp/send";

/**
 * Registra no CRM uma mensagem enviada automaticamente (sent_by/created_by
 * null = automação, mesmo padrão do SDR de IA). Sem isso a mensagem chega no
 * WhatsApp do lead mas some do histórico dentro do CRM — o vendedor abre a
 * conversa e não entende de onde veio a resposta do cliente.
 *
 * Usado pelas automações de funil (cron run-automations) e pelo motor de
 * trajetórias (automations/runtime.ts).
 */
export async function recordOutboundMessage(
  admin: ReturnType<typeof createAdminClient>,
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
