import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { findOrCreateContact } from "@/lib/whatsapp/findOrCreateContact";
import { runSdrLeadTurn } from "@/lib/ai-agents/runSdrLeadTurn";
import { triggerFlows } from "@/lib/automations/runtime";
import type { Json } from "@/types/database.types";

/**
 * Palavras que descadastram o lead de envios automáticos. Comparadas contra a
 * mensagem inteira (não "contém"), senão "não quero parar de receber" viraria
 * um opt-out. Exigência prática de LGPD e proteção do número do cliente: quem
 * pede pra sair e continua recebendo, denuncia.
 */
const OPT_OUT_WORDS = new Set([
  "sair",
  "parar",
  "pare",
  "para",
  "cancelar",
  "descadastrar",
  "descadastre",
  "remover",
  "stop",
  "unsubscribe",
]);

function isOptOutRequest(body: string): boolean {
  const clean = body
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/, "");
  return OPT_OUT_WORDS.has(clean);
}

/**
 * Shared inbound-message recorder used by both the Twilio webhook (per
 * tenant) and the Baileys `messages.upsert` handler (per tenant) — neither
 * has a real user session, so both write via the service-role client.
 */
export async function recordInboundMessage(input: {
  tenantId: string;
  fromNumber: string;
  toNumber: string;
  externalMessageId: string | null;
  body: string;
  contactName?: string | null;
  rawPayload?: Json;
}) {
  const supabase = createAdminClient();

  const contact = await findOrCreateContact(supabase, input.tenantId, input.fromNumber, input.contactName);
  if (!contact) {
    console.error("recordInboundMessage: failed to find/create contact for", input.fromNumber);
    return;
  }

  const { data: waMessage } = await supabase
    .from("whatsapp_messages")
    .insert({
      tenant_id: input.tenantId,
      contact_id: contact.id,
      twilio_sid: input.externalMessageId,
      direction: "inbound",
      from_number: input.fromNumber,
      to_number: input.toNumber,
      body: input.body,
      status: "received",
      raw_payload: input.rawPayload ?? null,
    })
    .select("id")
    .single();

  await supabase.from("activities").insert({
    tenant_id: input.tenantId,
    contact_id: contact.id,
    type: "whatsapp",
    direction: "inbound",
    body: input.body,
    whatsapp_message_id: waMessage?.id ?? null,
  });

  // Lead pediu pra sair: marca o descadastro e cancela o que estiver
  // agendado pra ele. Antes de qualquer automação, pra não responder na
  // mesma leva em que ele pediu pra parar.
  if (isOptOutRequest(input.body)) {
    await optOutContact(supabase, input.tenantId, contact.id);
    return;
  }

  // Lead novo entrando pelo WhatsApp também é "novo lead" pras trajetórias.
  if (contact.isNew) {
    void triggerFlows(supabase, input.tenantId, "lead_created", { contactId: contact.id });
  }
  void triggerFlows(supabase, input.tenantId, "message_received", { contactId: contact.id });

  // Se o tenant tiver um SDR de IA ativo e este contato ainda precisar de
  // cadastro, o SDR responde automaticamente (não faz nada caso contrário —
  // ver runSdrLeadTurn). Aguarda a resposta antes de responder o webhook.
  await runSdrLeadTurn(input.tenantId, contact.id);
}

/**
 * Marca o descadastro e encerra as trajetórias em andamento do lead — senão
 * um fluxo com "esperar 2 dias" já agendado continuaria mandando mensagem
 * depois do pedido.
 */
async function optOutContact(
  supabase: ReturnType<typeof createAdminClient>,
  tenantId: string,
  contactId: string,
): Promise<void> {
  await supabase
    .from("contacts")
    .update({ opted_out_at: new Date().toISOString(), opted_out_reason: "Pedido do lead pelo WhatsApp" })
    .eq("id", contactId);

  await supabase
    .from("flow_runs")
    .update({ status: "canceled", finished_at: new Date().toISOString() })
    .eq("contact_id", contactId)
    .in("status", ["running", "waiting"]);

  await supabase.from("activities").insert({
    tenant_id: tenantId,
    contact_id: contactId,
    type: "note",
    body: "Lead pediu para não receber mais mensagens automáticas (descadastrado).",
    created_by: null,
  });
}
