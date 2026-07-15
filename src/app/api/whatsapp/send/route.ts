import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { sendWhatsAppMessage, type OutgoingMedia } from "@/lib/whatsapp/send";
import {
  uploadMessageAttachment,
  getMessageAttachmentSignedUrl,
  MAX_ATTACHMENT_SIZE,
} from "@/lib/storage/messageAttachments";
import { convertToOggOpus } from "@/lib/audio/convertToOgg";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant não encontrado" }, { status: 400 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const contactId = String(formData.get("contactId") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const file = formData.get("file");
  const audio = formData.get("audio");

  if (!contactId) {
    return NextResponse.json({ error: "contactId é obrigatório" }, { status: 400 });
  }
  if (!message && !(file instanceof File && file.size) && !(audio instanceof File && audio.size)) {
    return NextResponse.json({ error: "Escreva uma mensagem ou anexe um arquivo" }, { status: 400 });
  }

  const { data: contact } = await supabase.from("contacts").select("id, phone").eq("id", contactId).single();

  if (!contact?.phone) {
    return NextResponse.json({ error: "Este contato não tem telefone cadastrado" }, { status: 400 });
  }

  let media: OutgoingMedia | undefined;
  let mediaMeta: { storagePath: string; contentType: string; fileName: string } | undefined;

  try {
    if (file instanceof File && file.size) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        return NextResponse.json({ error: "Arquivo muito grande (máx. 15MB)" }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadResult = await uploadMessageAttachment(tenantId, contactId, file.name, file.type, buffer);
      if ("error" in uploadResult) throw new Error(uploadResult.error);
      const signedUrl = await getMessageAttachmentSignedUrl(uploadResult.storagePath);
      if (!signedUrl) throw new Error("Não foi possível gerar link do arquivo");

      const mimetype = file.type || "application/octet-stream";
      media = {
        kind: mimetype.startsWith("image/") ? "image" : "document",
        buffer,
        mimetype,
        fileName: file.name,
        publicUrl: signedUrl,
      };
      mediaMeta = { storagePath: uploadResult.storagePath, contentType: mimetype, fileName: file.name };
    } else if (audio instanceof File && audio.size) {
      if (audio.size > MAX_ATTACHMENT_SIZE) {
        return NextResponse.json({ error: "Áudio muito grande (máx. 15MB)" }, { status: 400 });
      }
      const rawBuffer = Buffer.from(await audio.arrayBuffer());
      const oggBuffer = await convertToOggOpus(rawBuffer);
      const fileName = "audio.ogg";
      const uploadResult = await uploadMessageAttachment(tenantId, contactId, fileName, "audio/ogg", oggBuffer);
      if ("error" in uploadResult) throw new Error(uploadResult.error);
      const signedUrl = await getMessageAttachmentSignedUrl(uploadResult.storagePath);
      if (!signedUrl) throw new Error("Não foi possível gerar link do áudio");

      media = {
        kind: "audio",
        buffer: oggBuffer,
        mimetype: "audio/ogg; codecs=opus",
        fileName,
        publicUrl: signedUrl,
      };
      mediaMeta = { storagePath: uploadResult.storagePath, contentType: "audio/ogg", fileName };
    }

    const result = await sendWhatsAppMessage(tenantId, contact.phone, message, media);

    const { data: waMessage, error: insertError } = await supabase
      .from("whatsapp_messages")
      .insert({
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
      })
      .select("*")
      .single();

    if (insertError || !waMessage) {
      return NextResponse.json(
        { error: "Mensagem enviada, mas não foi possível registrar no histórico" },
        { status: 500 },
      );
    }

    await supabase.from("activities").insert({
      tenant_id: tenantId,
      contact_id: contact.id,
      type: "whatsapp",
      direction: "outbound",
      body: message || (mediaMeta ? `[arquivo] ${mediaMeta.fileName}` : ""),
      created_by: user.id,
      whatsapp_message_id: waMessage.id,
    });

    return NextResponse.json({ ok: true, message: waMessage });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : "Erro desconhecido ao enviar";
    console.error("sendWhatsAppMessage failed:", err);

    await supabase.from("whatsapp_messages").insert({
      tenant_id: tenantId,
      contact_id: contact.id,
      direction: "outbound",
      from_number: "",
      to_number: contact.phone,
      body: message || null,
      status: "failed",
      error_message: errMessage,
      sent_by: user.id,
    });

    return NextResponse.json({ error: `Falha ao enviar mensagem: ${errMessage}` }, { status: 502 });
  }
}
