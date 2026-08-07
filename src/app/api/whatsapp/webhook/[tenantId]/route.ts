import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTwilioSignature } from "@/lib/twilio/verifyWebhook";
import { recordInboundMessage } from "@/lib/whatsapp/recordInboundMessage";
import { publishChange } from "@/lib/realtime/bus";
import { uploadMessageAttachment, MAX_ATTACHMENT_SIZE } from "@/lib/storage/messageAttachments";
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

/** Extensão a partir do content-type, pra dar um nome de arquivo decente à mídia do Twilio. */
function extForContentType(contentType: string): string {
  const sub = contentType.split("/")[1]?.split(";")[0] ?? "";
  if (sub === "jpeg") return "jpg";
  if (sub === "ogg") return "ogg";
  if (sub === "mpeg") return "mp3";
  return sub || "bin";
}

/**
 * Baixa a mídia inbound do Twilio (a MediaUrl exige Basic Auth com sid:token) e
 * guarda no storage, devolvendo os metadados pro recordInboundMessage. Não
 * lança: falha de mídia não pode derrubar o registro da mensagem.
 */
async function downloadTwilioMedia(
  tenantId: string,
  fromNumber: string,
  mediaUrl: string,
  contentType: string,
  accountSid: string,
  authToken: string,
): Promise<{ storagePath: string; contentType: string; fileName: string | null } | null> {
  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const res = await fetch(mediaUrl, { headers: { Authorization: `Basic ${auth}` } });
    if (!res.ok) {
      console.error("downloadTwilioMedia: HTTP", res.status);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_ATTACHMENT_SIZE) return null;

    const realType = res.headers.get("content-type")?.split(";")[0] || contentType;
    const fileName = `midia.${extForContentType(realType)}`;
    // Pasta por número do remetente — o contactId ainda não existe aqui.
    const uploaded = await uploadMessageAttachment(tenantId, fromNumber.replace(/\D/g, ""), fileName, realType, buffer);
    if ("error" in uploaded) return null;

    return { storagePath: uploaded.storagePath, contentType: realType, fileName };
  } catch (err) {
    console.error("downloadTwilioMedia falhou (ignorado):", err);
    return null;
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;

  const supabase = createAdminClient();

  const { data: connection } = await supabase
    .from("whatsapp_connections")
    .select("twilio_auth_token, twilio_account_sid")
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
  if (params_.From && params_.MessageSid) {
    const fromNumber = stripWhatsAppPrefix(params_.From);

    // Mídia (imagem/áudio/documento): o Twilio manda por URL autenticada — baixa
    // e guarda pra o SDR poder ver/ouvir (mesma capacidade do canal Baileys).
    let media: { storagePath: string; contentType: string; fileName: string | null } | null = null;
    if (Number(params_.NumMedia ?? "0") > 0 && params_.MediaUrl0 && connection.twilio_account_sid) {
      media = await downloadTwilioMedia(
        tenantId,
        fromNumber,
        params_.MediaUrl0,
        params_.MediaContentType0 || "application/octet-stream",
        connection.twilio_account_sid,
        connection.twilio_auth_token,
      );
    }

    await recordInboundMessage({
      tenantId,
      fromNumber,
      toNumber: stripWhatsAppPrefix(params_.To ?? ""),
      externalMessageId: params_.MessageSid,
      body: params_.Body ?? "",
      rawPayload: params_,
      media,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
