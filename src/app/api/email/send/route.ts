import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { sendEmailMessage, getConnectedEmailProviders } from "@/lib/email/send";
import { emailSendSchema } from "@/lib/validation/email";
import { uploadMessageAttachment, MAX_ATTACHMENT_SIZE } from "@/lib/storage/messageAttachments";
import type { OAuthProviderKey } from "@/lib/integrations/providers";
import type { EmailAttachmentInput } from "@/lib/email/types";

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

  const parsed = emailSendSchema.safeParse({
    contactId: formData.get("contactId"),
    subject: formData.get("subject"),
    message: formData.get("message"),
    provider: formData.get("provider") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, email")
    .eq("id", parsed.data.contactId)
    .single();

  if (!contact?.email) {
    return NextResponse.json({ error: "Este contato não tem e-mail cadastrado" }, { status: 400 });
  }

  let provider: OAuthProviderKey | undefined = parsed.data.provider;
  if (!provider) {
    const connected = await getConnectedEmailProviders(tenantId);
    if (!connected.length) {
      return NextResponse.json(
        { error: "Nenhuma conta de e-mail conectada — acesse Configurações." },
        { status: 400 },
      );
    }
    provider = connected[0].provider;
  }

  const attachmentsForSend: EmailAttachmentInput[] = [];
  const attachmentsMeta: { fileName: string; storagePath: string; sizeBytes: number; contentType: string }[] = [];

  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_SIZE) {
      return NextResponse.json({ error: `Arquivo muito grande: ${file.name} (máx. 15MB)` }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "application/octet-stream";
    const uploadResult = await uploadMessageAttachment(tenantId, contact.id, file.name, contentType, buffer);
    if ("error" in uploadResult) {
      return NextResponse.json({ error: `Falha ao enviar anexo ${file.name}: ${uploadResult.error}` }, { status: 500 });
    }
    attachmentsForSend.push({ filename: file.name, contentType, content: buffer });
    attachmentsMeta.push({ fileName: file.name, storagePath: uploadResult.storagePath, sizeBytes: file.size, contentType });
  }

  try {
    const result = await sendEmailMessage(tenantId, provider, {
      to: contact.email,
      subject: parsed.data.subject,
      body: parsed.data.message,
      attachments: attachmentsForSend,
    });

    const { data: emailMessage, error: insertError } = await supabase
      .from("email_messages")
      .insert({
        tenant_id: tenantId,
        contact_id: contact.id,
        provider: result.provider,
        external_message_id: result.externalId,
        direction: "outbound",
        from_address: result.fromAddress,
        to_address: contact.email,
        subject: parsed.data.subject,
        body: parsed.data.message,
        status: "sent",
        sent_by: user.id,
        attachments: attachmentsMeta,
      })
      .select("*")
      .single();

    if (insertError || !emailMessage) {
      return NextResponse.json(
        { error: "E-mail enviado, mas não foi possível registrar no histórico" },
        { status: 500 },
      );
    }

    await supabase.from("activities").insert({
      tenant_id: tenantId,
      contact_id: contact.id,
      type: "email",
      direction: "outbound",
      body: parsed.data.subject,
      created_by: user.id,
      email_message_id: emailMessage.id,
    });

    return NextResponse.json({ ok: true, message: emailMessage });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao enviar";
    console.error("sendEmailMessage failed:", err);

    await supabase.from("email_messages").insert({
      tenant_id: tenantId,
      contact_id: contact.id,
      provider,
      external_message_id: `failed-${randomUUID()}`,
      direction: "outbound",
      from_address: "",
      to_address: contact.email,
      subject: parsed.data.subject,
      body: parsed.data.message,
      status: "failed",
      error_message: message,
      sent_by: user.id,
      attachments: attachmentsMeta,
    });

    return NextResponse.json({ error: `Falha ao enviar e-mail: ${message}` }, { status: 502 });
  }
}
