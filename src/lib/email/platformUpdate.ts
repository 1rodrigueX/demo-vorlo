import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { Resend } from "resend";

/**
 * E-mail de comunicado de atualização da Vorlo.
 *
 * O "banner" é HTML, não imagem: cliente de e-mail bloqueia imagem externa por
 * padrão, e um banner bloqueado deixa o e-mail começando com um retângulo
 * vazio. Barra colorida com a marca sempre aparece.
 */

const BRAND = "#ff5722";
const BRAND_DARK = "#1a0f08";

let client: Resend | null = null;

function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada");
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://45.149.153.20";
}

/**
 * Assina o e-mail no link de descadastro. Sem isso, qualquer um descadastraria
 * qualquer endereço só trocando o parâmetro da URL.
 */
function unsubscribeSecret(): string {
  return process.env.UNSUBSCRIBE_SECRET || process.env.SECRETS_ENC_KEY || process.env.CRON_SECRET || "";
}

export function signEmail(email: string): string {
  return createHmac("sha256", unsubscribeSecret()).update(email.toLowerCase()).digest("hex").slice(0, 32);
}

export function verifyEmailSignature(email: string, signature: string): boolean {
  const expected = signEmail(email);
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function unsubscribeUrl(email: string): string {
  const params = new URLSearchParams({ e: email, t: signEmail(email) });
  return `${siteUrl()}/descadastrar?${params.toString()}`;
}

export type PlatformUpdateEmail = {
  title: string;
  version?: string | null;
  body: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
};

/** Escapa o que o dev digitou — o corpo vai pra dentro de HTML. */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Quebra de linha simples vira <br>, linha em branco vira parágrafo novo. */
function bodyToHtml(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 16px;line-height:1.65;">${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

export function renderPlatformUpdateHtml(update: PlatformUpdateEmail, recipientEmail: string): string {
  const cta =
    update.ctaLabel && update.ctaUrl
      ? `<tr><td style="padding:8px 32px 24px;">
           <a href="${escapeHtml(update.ctaUrl)}"
              style="display:inline-block;background:${BRAND};color:#fff;padding:13px 26px;border-radius:9px;text-decoration:none;font-weight:600;font-size:15px;">
             ${escapeHtml(update.ctaLabel)}
           </a>
         </td></tr>`
      : "";

  const versionTag = update.version
    ? `<span style="display:inline-block;background:rgba(255,255,255,0.16);color:#fff;font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px;margin-top:10px;">${escapeHtml(update.version)}</span>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:24px 12px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,0.08);">
    <tr>
      <td style="background:linear-gradient(135deg,${BRAND_DARK} 0%,#2d1a10 100%);padding:28px 32px;">
        <div style="color:#ffffff;font-size:21px;font-weight:700;letter-spacing:-0.4px;">
          Vorlo<span style="color:${BRAND};">.</span>
        </div>
        <div style="color:rgba(255,255,255,0.55);font-size:13px;margin-top:2px;">Novidades da plataforma</div>
        ${versionTag}
      </td>
    </tr>
    <tr>
      <td style="padding:30px 32px 8px;">
        <h1 style="margin:0 0 18px;font-size:21px;line-height:1.35;font-weight:700;color:#111827;">${escapeHtml(update.title)}</h1>
        <div style="font-size:15px;color:#374151;">${bodyToHtml(update.body)}</div>
      </td>
    </tr>
    ${cta}
    <tr>
      <td style="padding:8px 32px 30px;border-top:1px solid #f3f4f6;">
        <p style="margin:20px 0 0;font-size:15px;color:#374151;line-height:1.6;">
          Qualquer dúvida, é só responder este e-mail — a gente lê todas.
        </p>
        <p style="margin:16px 0 0;font-size:15px;color:#111827;">
          Att,<br><strong>Time Vorlo</strong>
        </p>
      </td>
    </tr>
    <tr>
      <td style="background:#fafafa;padding:18px 32px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
          Você recebe este e-mail porque tem uma conta na Vorlo.<br>
          <a href="${unsubscribeUrl(recipientEmail)}" style="color:#6b7280;text-decoration:underline;">
            Não quero mais receber novidades
          </a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Versão texto puro — melhora entregabilidade e atende quem lê sem HTML. */
export function renderPlatformUpdateText(update: PlatformUpdateEmail, recipientEmail: string): string {
  return [
    `VORLO — Novidades da plataforma${update.version ? ` (${update.version})` : ""}`,
    "",
    update.title,
    "",
    update.body,
    update.ctaLabel && update.ctaUrl ? `\n${update.ctaLabel}: ${update.ctaUrl}` : "",
    "",
    "Qualquer dúvida, é só responder este e-mail — a gente lê todas.",
    "",
    "Att,",
    "Time Vorlo",
    "",
    `Não quer mais receber novidades? ${unsubscribeUrl(recipientEmail)}`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * Envia um lote. O Resend aceita até 100 por chamada; quem chama fatia a lista
 * e cuida do progresso (ver actions/platform-updates.ts).
 */
export async function sendPlatformUpdateBatch(
  update: PlatformUpdateEmail,
  recipients: string[],
): Promise<{ sent: number; failed: number; error?: string }> {
  if (!recipients.length) return { sent: 0, failed: 0 };

  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const subject = update.version ? `${update.title} (${update.version})` : update.title;

  try {
    const { error } = await resend.batch.send(
      recipients.map((to) => ({
        from,
        to,
        subject,
        html: renderPlatformUpdateHtml(update, to),
        text: renderPlatformUpdateText(update, to),
      })),
    );

    if (error) {
      console.error("sendPlatformUpdateBatch failed:", error);
      return { sent: 0, failed: recipients.length, error: error.message };
    }
    return { sent: recipients.length, failed: 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido no envio";
    console.error("sendPlatformUpdateBatch threw:", message);
    return { sent: 0, failed: recipients.length, error: message };
  }
}
