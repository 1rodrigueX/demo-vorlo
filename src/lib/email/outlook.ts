import "server-only";
import { randomUUID } from "node:crypto";
import type { ParsedEmail, EmailAttachmentInput } from "./types";

const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";
const FETCH_TIMEOUT_MS = 15000;

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

type OutlookMessage = {
  id: string;
  conversationId: string | null;
  subject?: string;
  from?: { emailAddress?: { address?: string } };
  toRecipients?: { emailAddress?: { address?: string } }[];
  body?: { contentType?: string; content?: string };
  receivedDateTime?: string;
};

export async function listOutlookMessages(accessToken: string, top = 25): Promise<ParsedEmail[]> {
  const query = new URLSearchParams({
    $top: String(top),
    $orderby: "receivedDateTime desc",
    $select: "id,conversationId,subject,from,toRecipients,body,receivedDateTime",
  });

  // Só a pasta Caixa de Entrada — enviados/rascunhos ficam de fora (o envio
  // pelo CRM já grava o outbound separadamente).
  const res = await fetch(`${GRAPH_API_BASE}/me/mailFolders/inbox/messages?${query.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Outlook: falha ao listar mensagens (${res.status})`);

  const data = (await res.json()) as { value?: OutlookMessage[] };

  return (data.value ?? []).map((m) => {
    const content = m.body?.content ?? "";
    return {
      externalId: m.id,
      threadId: m.conversationId ?? null,
      from: m.from?.emailAddress?.address ?? "",
      to: (m.toRecipients ?? []).map((r) => r.emailAddress?.address).filter(Boolean).join(", "),
      subject: m.subject ?? "",
      body: m.body?.contentType === "html" ? stripHtml(content) : content,
      date: m.receivedDateTime ?? new Date().toISOString(),
    };
  });
}

/** O Graph não retorna o id da mensagem enviada em /sendMail — geramos um id local só pra ter uma chave única na tabela. */
export async function sendOutlookMessage(
  accessToken: string,
  params: { to: string; subject: string; body: string; attachments?: EmailAttachmentInput[] },
): Promise<string> {
  const attachments = (params.attachments ?? []).map((att) => ({
    "@odata.type": "#microsoft.graph.fileAttachment",
    name: att.filename,
    contentType: att.contentType,
    contentBytes: att.content.toString("base64"),
  }));

  const res = await fetch(`${GRAPH_API_BASE}/me/sendMail`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject: params.subject,
        body: { contentType: "Text", content: params.body },
        toRecipients: [{ emailAddress: { address: params.to } }],
        ...(attachments.length ? { attachments } : {}),
      },
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Outlook: falha ao enviar (${res.status}): ${text}`);
  }

  return `outlook-sent-${randomUUID()}`;
}
