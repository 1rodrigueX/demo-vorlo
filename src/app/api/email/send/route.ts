import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantId } from "@/lib/auth/current-user";
import { sendEmailMessage, getConnectedEmailProviders } from "@/lib/email/send";
import { emailSendSchema, parseCcAddresses } from "@/lib/validation/email";
import { findOrCreateContactByEmail } from "@/lib/email/findOrCreateContactByEmail";
import { sanitizeEmailHtml, htmlToPlainText } from "@/lib/email/sanitizeHtml";
import { uploadMessageAttachment, MAX_ATTACHMENT_SIZE } from "@/lib/storage/messageAttachments";
import { publishChange } from "@/lib/realtime/bus";
import type { OAuthProviderKey } from "@/lib/integrations/providers";
import type { EmailAttachmentInput } from "@/lib/email/types";
import type { EmailMessage } from "@/types/domain";

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
    contactId: formData.get("contactId") || undefined,
    to: formData.get("to") || undefined,
    cc: formData.get("cc") || undefined,
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

  let ccList: string[];
  try {
    ccList = parseCcAddresses(parsed.data.cc);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Cc inválido" }, { status: 400 });
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

  let contact: { id: string; email: string } | null = null;

  if (parsed.data.contactId) {
    const { data } = await supabase.from("contacts").select("id, email").eq("id", parsed.data.contactId).single();
    if (!data?.email) {
      return NextResponse.json({ error: "Este contato não tem e-mail cadastrado" }, { status: 400 });
    }
    contact = { id: data.id, email: data.email };
  } else if (parsed.data.to) {
    // Destinatário digitado livremente (compose "Novo e-mail"): acha ou cria
    // o contato correspondente — precisa do admin client porque o rodízio
    // de leads pode atribuir a um vendedor diferente do usuário logado.
    const admin = createAdminClient();
    const created = await findOrCreateContactByEmail(admin, tenantId, parsed.data.to);
    if (!created) {
      return NextResponse.json({ error: "Não foi possível criar o contato pra esse e-mail" }, { status: 500 });
    }
    contact = { id: created.id, email: parsed.data.to };
  }

  if (!contact) {
    return NextResponse.json({ error: "Informe o destinatário" }, { status: 400 });
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

  const ccAddress = ccList.length ? ccList.join(", ") : null;
  const bodyHtml = sanitizeEmailHtml(parsed.data.message);
  const bodyText = htmlToPlainText(bodyHtml);

  try {
    const result = await sendEmailMessage(tenantId, provider, {
      to: contact.email,
      cc: ccAddress ?? undefined,
      subject: parsed.data.subject,
      html: bodyHtml,
      attachments: attachmentsForSend,
    });

    const emailMessage: EmailMessage = {
      id: randomUUID(),
      tenant_id: tenantId,
      contact_id: contact.id,
      provider: result.provider,
      external_message_id: result.externalId,
      thread_id: null,
      direction: "outbound",
      from_address: result.fromAddress,
      to_address: contact.email,
      cc_address: ccAddress,
      subject: parsed.data.subject,
      body: bodyText,
      body_html: bodyHtml,
      status: "sent",
      error_message: null,
      raw_payload: null,
      sent_by: user.id,
      attachments: attachmentsMeta,
      created_at: new Date().toISOString(),
    };

    // Não faz .select() de volta: se o contato não for "do" usuário logado
    // (ex: e-mail pra um contato de outro vendedor), o RLS de select bloqueia
    // o retorno mesmo com o insert já tendo funcionado — por isso montamos o
    // objeto de resposta a partir dos valores que já temos em mãos.
    const { error: insertError } = await supabase.from("email_messages").insert(emailMessage);

    if (insertError) {
      console.error("email_messages insert failed:", insertError);
      return NextResponse.json(
        { error: `E-mail enviado, mas não foi possível registrar no histórico: ${insertError.message}` },
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

    // Tempo real: outro atendente vendo esse contato recebe o e-mail enviado.
    publishChange(tenantId, "email_messages", "INSERT", contact.id);

    return NextResponse.json({ ok: true, message: emailMessage });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao enviar";
    console.error("sendEmailMessage failed:", err);

    await supabase.from("email_messages").insert({
      id: randomUUID(),
      tenant_id: tenantId,
      contact_id: contact.id,
      provider,
      external_message_id: `failed-${randomUUID()}`,
      direction: "outbound",
      from_address: "",
      to_address: contact.email,
      cc_address: ccAddress,
      subject: parsed.data.subject,
      body: bodyText,
      body_html: bodyHtml,
      status: "failed",
      error_message: message,
      sent_by: user.id,
      attachments: attachmentsMeta,
    });

    return NextResponse.json({ error: `Falha ao enviar e-mail: ${message}` }, { status: 502 });
  }
}
