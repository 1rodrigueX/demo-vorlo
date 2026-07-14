import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTwilioSignature } from "@/lib/twilio/verifyWebhook";
import { recordInboundMessage } from "@/lib/whatsapp/recordInboundMessage";
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

export async function POST(request: Request) {
  const rawBody = await request.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));
  const signature = request.headers.get("x-twilio-signature");

  const isValid = verifyTwilioSignature(signature, request.url, params);
  if (!isValid) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 403 });
  }

  const supabase = createAdminClient();

  // Status callback de uma mensagem que a equipe enviou.
  if (params.MessageStatus && params.MessageSid) {
    const status = KNOWN_STATUSES.includes(params.MessageStatus as WhatsAppStatus)
      ? (params.MessageStatus as WhatsAppStatus)
      : undefined;

    if (status) {
      await supabase
        .from("whatsapp_messages")
        .update({
          status,
          error_message: params.ErrorMessage ?? null,
        })
        .eq("twilio_sid", params.MessageSid);
    }

    return NextResponse.json({ ok: true });
  }

  // Mensagem inbound recebida de um contato.
  if (params.Body !== undefined && params.From && params.MessageSid) {
    await recordInboundMessage({
      fromNumber: stripWhatsAppPrefix(params.From),
      toNumber: stripWhatsAppPrefix(params.To ?? ""),
      externalMessageId: params.MessageSid,
      body: params.Body,
      rawPayload: params,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
