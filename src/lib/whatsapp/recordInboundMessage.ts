import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { findOrCreateContact } from "@/lib/whatsapp/findOrCreateContact";
import type { Json } from "@/types/database.types";

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
}
