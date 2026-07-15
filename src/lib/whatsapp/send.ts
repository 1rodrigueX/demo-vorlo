import "server-only";
import { getTwilioClient } from "@/lib/twilio/client";
import { getBaileysState } from "@/lib/whatsapp/baileysClient";
import { createAdminClient } from "@/lib/supabase/admin";

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

async function sendViaTwilio(
  tenantId: string,
  toPhone: string,
  body: string,
  credentials: { accountSid: string; authToken: string; whatsappNumber: string },
): Promise<SendResult> {
  const client = getTwilioClient(credentials.accountSid, credentials.authToken);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  // O Twilio recusa localhost como statusCallback (precisa ser público).
  // Sem ela, o envio funciona normalmente — só não recebemos updates de
  // status/mensagens inbound até termos um túnel público (ex: ngrok).
  const statusCallback = isPubliclyReachable(siteUrl)
    ? `${siteUrl}/api/whatsapp/webhook/${tenantId}`
    : undefined;

  const message = await client.messages.create({
    from: toWhatsAppAddress(credentials.whatsappNumber),
    to: toWhatsAppAddress(toPhone),
    body,
    ...(statusCallback ? { statusCallback } : {}),
  });

  return { externalId: message.sid, from: message.from, to: message.to, initialStatus: "queued" };
}

async function sendViaBaileys(tenantId: string, toPhone: string, body: string): Promise<SendResult> {
  const state = getBaileysState(tenantId);

  if (state.status !== "connected" || !state.sock) {
    throw new Error("WhatsApp (QR code) não está conectado — acesse Configurações para parear.");
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

export async function sendWhatsAppMessage(
  tenantId: string,
  toPhone: string,
  body: string,
): Promise<SendResult> {
  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("whatsapp_connections")
    .select("provider, twilio_account_sid, twilio_auth_token, twilio_whatsapp_number")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (connection?.provider === "twilio") {
    if (!connection.twilio_account_sid || !connection.twilio_auth_token || !connection.twilio_whatsapp_number) {
      throw new Error("Twilio não está configurado — acesse Configurações para preencher as credenciais.");
    }
    return sendViaTwilio(tenantId, toPhone, body, {
      accountSid: connection.twilio_account_sid,
      authToken: connection.twilio_auth_token,
      whatsappNumber: connection.twilio_whatsapp_number,
    });
  }

  return sendViaBaileys(tenantId, toPhone, body);
}
