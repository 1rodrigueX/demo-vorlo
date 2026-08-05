import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppMessage, type OutgoingMedia } from "@/lib/whatsapp/send";
import {
  uploadMessageAttachment,
  getMessageAttachmentSignedUrl,
  MAX_ATTACHMENT_SIZE,
} from "@/lib/storage/messageAttachments";
import { convertToOggOpus } from "@/lib/audio/convertToOgg";

// Envio de WhatsApp (texto, arquivo, áudio) pro app desktop nativo. Operação
// privilegiada (Twilio/Baileys + Storage) — o app chama passando o JWT do
// usuário no Bearer. Sob /api/public/ porque é o prefixo que o nginx expõe;
// segurança é o token, não a origem, então CORS é liberado (sem cookies).
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401, headers: CORS });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão inválida" }, { status: 401, headers: CORS });

  const { data: profile } = await sb.from("profiles").select("tenant_id").eq("id", user.id).maybeSingle();
  const tenantId = profile?.tenant_id;
  if (!tenantId) return NextResponse.json({ error: "Tenant não encontrado" }, { status: 403, headers: CORS });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Requisição inválida" }, { status: 400, headers: CORS });

  const contactId = String(form.get("contactId") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();
  const file = form.get("file");
  const audio = form.get("audio");
  if (!contactId) return NextResponse.json({ error: "contactId é obrigatório" }, { status: 400, headers: CORS });
  const hasFile = file instanceof File && file.size > 0;
  const hasAudio = audio instanceof File && audio.size > 0;
  if (!message && !hasFile && !hasAudio) {
    return NextResponse.json({ error: "Escreva algo ou anexe um arquivo" }, { status: 400, headers: CORS });
  }

  const { data: contact } = await sb.from("contacts").select("id, phone").eq("id", contactId).maybeSingle();
  if (!contact?.phone) {
    return NextResponse.json({ error: "Contato sem telefone" }, { status: 400, headers: CORS });
  }

  const admin = createAdminClient();
  let media: OutgoingMedia | undefined;
  let mediaMeta: { storagePath: string; contentType: string; fileName: string } | undefined;

  try {
    if (hasFile) {
      const f = file as File;
      if (f.size > MAX_ATTACHMENT_SIZE) {
        return NextResponse.json({ error: "Arquivo muito grande (máx. 15MB)" }, { status: 400, headers: CORS });
      }
      const buffer = Buffer.from(await f.arrayBuffer());
      const up = await uploadMessageAttachment(tenantId, contactId, f.name, f.type, buffer);
      if ("error" in up) throw new Error(up.error);
      const signedUrl = await getMessageAttachmentSignedUrl(up.storagePath);
      if (!signedUrl) throw new Error("Não foi possível gerar link do arquivo");
      const mimetype = f.type || "application/octet-stream";
      media = { kind: mimetype.startsWith("image/") ? "image" : "document", buffer, mimetype, fileName: f.name, publicUrl: signedUrl };
      mediaMeta = { storagePath: up.storagePath, contentType: mimetype, fileName: f.name };
    } else if (hasAudio) {
      const a = audio as File;
      if (a.size > MAX_ATTACHMENT_SIZE) {
        return NextResponse.json({ error: "Áudio muito grande (máx. 15MB)" }, { status: 400, headers: CORS });
      }
      const oggBuffer = await convertToOggOpus(Buffer.from(await a.arrayBuffer()));
      const fileName = "audio.ogg";
      const up = await uploadMessageAttachment(tenantId, contactId, fileName, "audio/ogg", oggBuffer);
      if ("error" in up) throw new Error(up.error);
      const signedUrl = await getMessageAttachmentSignedUrl(up.storagePath);
      if (!signedUrl) throw new Error("Não foi possível gerar link do áudio");
      media = { kind: "audio", buffer: oggBuffer, mimetype: "audio/ogg; codecs=opus", fileName, publicUrl: signedUrl };
      mediaMeta = { storagePath: up.storagePath, contentType: "audio/ogg", fileName };
    }

    const result = await sendWhatsAppMessage(tenantId, contact.phone, message, media);

    const waId = randomUUID();
    await admin.from("whatsapp_messages").insert({
      id: waId,
      tenant_id: tenantId,
      contact_id: contact.id,
      twilio_sid: result.externalId,
      direction: "outbound",
      from_number: result.from,
      to_number: result.to,
      body: message || null,
      status: result.initialStatus,
      sent_by: user.id,
      media_storage_path: mediaMeta?.storagePath ?? null,
      media_content_type: mediaMeta?.contentType ?? null,
      media_file_name: mediaMeta?.fileName ?? null,
    });
    await admin.from("activities").insert({
      tenant_id: tenantId,
      contact_id: contact.id,
      type: "whatsapp",
      direction: "outbound",
      body: message || (mediaMeta ? `[arquivo] ${mediaMeta.fileName}` : ""),
      created_by: user.id,
      whatsapp_message_id: waId,
    });

    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro desconhecido";
    return NextResponse.json({ error: `Falha ao enviar: ${msg}` }, { status: 500, headers: CORS });
  }
}
