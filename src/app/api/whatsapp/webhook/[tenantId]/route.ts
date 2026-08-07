import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTwilioSignature } from "@/lib/twilio/verifyWebhook";
import { recordInboundMessage } from "@/lib/whatsapp/recordInboundMessage";
import { publishChange } from "@/lib/realtime/bus";
import type { Database } from "@/types/database.types";

type WhatsAppStatus = Database["public"]["Tables"]["whatsapp_messages"]["Row"]["status"];

const KNOWN_STATUSES: WhatsAppStatus[] = [
  "queued",
  "sending",
  "sent",
  "delivered",
  "undelivered",
  "read",
  "failed",
  "received",
];

function stripWhatsAppPrefix(address: string) {
  return address.replace(/^whatsapp:/, "");
}

export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;

  const supabase = createAdminClient();

  const { data: connection } = await supabase
    .from("whatsapp_connections")
    .select("twilio_auth_token")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!connection?.twilio_auth_token) {
    return NextResponse.json({ error: "Tenant sem Twilio configurado" }, { status: 404 });
  }

  const rawBody = await request.text();
  const params_ = Object.fromEntries(new URLSearchParams(rawBody));
  const signature = request.headers.get("x-twilio-signature");

  const isValid = verifyTwilioSignature(signature, request.url, params_, connection.twilio_auth_token);
  if (!isValid) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 403 });
  }

  // Status callback de uma mensagem que a equipe enviou.
  if (params_.MessageStatus && params_.MessageSid) {
    const status = KNOWN_STATUSES.includes(params_.MessageStatus as WhatsAppStatus)
      ? (params_.MessageStatus as WhatsAppStatus)
      : undefined;

    if (status) {
      const { data: updatedRows } = await supabase
        .from("whatsapp_messages")
        .update({
          status,
          error_message: params_.ErrorMessage ?? null,
        })
        .eq("twilio_sid", params_.MessageSid)
        .eq("tenant_id", tenantId)
        .select("contact_id");

      // Tempo real: o chat aberto recarrega e mostra o novo status (✓✓/lido).
      for (const contactId of new Set((updatedRows ?? []).map((r) => r.contact_id))) {
        publishChange(tenantId, "whatsapp_messages", "UPDATE", contactId);
      }
    }

    return NextResponse.json({ ok: true });
  }

  // Mensagem inbound recebida de um contato.
  if (params_.Body !== undefined && params_.From && params_.MessageSid) {
    await recordInboundMessage({
      tenantId,
      fromNumber: stripWhatsAppPrefix(params_.From),
      toNumber: stripWhatsAppPrefix(params_.To ?? ""),
      externalMessageId: params_.MessageSid,
      body: params_.Body,
      rawPayload: params_,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
