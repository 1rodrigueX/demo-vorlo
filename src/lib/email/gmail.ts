import "server-only";
import type { ParsedEmail, EmailAttachmentInput } from "./types";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";
const FETCH_TIMEOUT_MS = 15000;

type GmailMessagePart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailMessagePart[];
};

type GmailHeader = { name: string; value: string };

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function findTextPart(payload: GmailMessagePart | undefined, mimeType: string): string | null {
  if (!payload) return null;
  if (payload.mimeType === mimeType && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  for (const part of payload.parts ?? []) {
    const found = findTextPart(part, mimeType);
    if (found) return found;
  }
  return null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function getHeader(headers: GmailHeader[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

/** Só a caixa de entrada — enviados/rascunhos/spam ficam de fora (o envio pelo CRM já grava o outbound separadamente). */
export async function listGmailMessageIds(accessToken: string, maxResults = 25): Promise<string[]> {
  const res = await fetch(`${GMAIL_API_BASE}/users/me/messages?maxResults=${maxResults}&labelIds=INBOX`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Gmail: falha ao listar mensagens (${res.status})`);
  const data = (await res.json()) as { messages?: { id: string }[] };
  return (data.messages ?? []).map((m) => m.id);
}

export async function getGmailMessage(accessToken: string, id: string): Promise<ParsedEmail> {
  const res = await fetch(`${GMAIL_API_BASE}/users/me/messages/${id}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Gmail: falha ao buscar mensagem ${id} (${res.status})`);
  const data = (await res.json()) as {
    id: string;
    threadId: string;
    snippet?: string;
    internalDate?: string;
    payload?: GmailMessagePart & { headers?: GmailHeader[] };
  };

  const headers = data.payload?.headers ?? [];
  const bodyText = findTextPart(data.payload, "text/plain");
  const bodyHtml = findTextPart(data.payload, "text/html");
  const body = bodyText ?? (bodyHtml ? stripHtml(bodyHtml) : data.snippet ?? "");

  return {
    externalId: data.id,
    threadId: data.threadId,
    from: getHeader(headers, "From"),
    to: getHeader(headers, "To"),
    subject: getHeader(headers, "Subject"),
    body,
    date: data.internalDate ? new Date(Number(data.internalDate)).toISOString() : new Date().toISOString(),
  };
}

function buildGmailRawMessage(params: {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  attachments?: EmailAttachmentInput[];
}): string {
  const attachments = params.attachments ?? [];
  const headerLines = [`To: ${params.to}`, ...(params.cc ? [`Cc: ${params.cc}`] : []), `Subject: ${params.subject}`];

  if (!attachments.length) {
    return [...headerLines, `Content-Type: text/plain; charset="UTF-8"`, "", params.body].join("\r\n");
  }

  const boundary = `----=_Part_${Date.now()}`;
  const lines = [
    ...headerLines,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    "",
    params.body,
  ];

  for (const att of attachments) {
    lines.push(
      "",
      `--${boundary}`,
      `Content-Type: ${att.contentType}; name="${att.filename}"`,
      `Content-Disposition: attachment; filename="${att.filename}"`,
      `Content-Transfer-Encoding: base64`,
      "",
      att.content.toString("base64"),
    );
  }
  lines.push("", `--${boundary}--`);

  return lines.join("\r\n");
}

export async function sendGmailMessage(
  accessToken: string,
  params: { to: string; cc?: string; subject: string; body: string; attachments?: EmailAttachmentInput[] },
): Promise<string> {
  const raw = buildGmailRawMessage(params);

  const encoded = Buffer.from(raw, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch(`${GMAIL_API_BASE}/users/me/messages/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encoded }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gmail: falha ao enviar (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}
