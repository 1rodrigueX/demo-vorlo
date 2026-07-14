import "server-only";
import { getTwilioClient } from "@/lib/twilio/client";
import { getBaileysState } from "@/lib/whatsapp/baileysClient";

export type SendResult = {
  externalId: string | null;
  from: string;
  to: string;
  /** Estado inicial correto para a linha de whatsapp_messages logo após o envio. */
  initialStatus: "queued" | "sent";
};

function toWhatsAppAddress(phone: string) {
  return phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
}

function isPubliclyReachable(url: string) {
  try {
    const { hostname } = new URL(url);
    return hostname !== "localhost" && hostname !== "127.0.0.1";
  } catch {
    return false;
  }
}

async function sendViaTwilio(toPhone: string, body: string): Promise<SendResult> {
  const client = getTwilioClient();
  const from = process.env.TWILIO_WHATSAPP_NUMBER!;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  // O Twilio recusa localhost como statusCallback (precisa ser público).
  // Sem ela, o envio funciona normalmente — só não recebemos updates de
  // status/mensagens inbound até termos um túnel público (ex: ngrok).
  const statusCallback = isPubliclyReachable(siteUrl)
    ? `${siteUrl}/api/whatsapp/webhook`
    : undefined;

  const message = await client.messages.create({
    from: toWhatsAppAddress(from),
    to: toWhatsAppAddress(toPhone),
    body,
    ...(statusCallback ? { statusCallback } : {}),
  });

  return { externalId: message.sid, from: message.from, to: message.to, initialStatus: "queued" };
}

async function sendViaBaileys(toPhone: string, body: string): Promise<SendResult> {
  const state = getBaileysState();

  if (state.status !== "connected" || !state.sock) {
    throw new Error("WhatsApp (QR code) não está conectado — acesse /whatsapp para parear.");
  }

  const digits = toPhone.replace(/^\+/, "");
  const jid = `${digits}@s.whatsapp.net`;

  const sent = await state.sock.sendMessage(jid, { text: body });

  return {
    externalId: sent?.key.id ?? null,
    from: state.phoneNumber ?? "",
    to: toPhone,
    initialStatus: "sent",
  };
}

export async function sendWhatsAppMessage(toPhone: string, body: string): Promise<SendResult> {
  const provider = process.env.WHATSAPP_PROVIDER ?? "twilio";
  return provider === "baileys" ? sendViaBaileys(toPhone, body) : sendViaTwilio(toPhone, body);
}
