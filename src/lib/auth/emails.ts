import "server-only";
import { Resend } from "resend";
import { createAuthToken } from "@/lib/auth/db";

/**
 * E-mails de autenticação (confirmação de cadastro e reset de senha) via Resend
 * — no lugar dos e-mails que o GoTrue do Supabase mandava. Mesma config do
 * comunicado de plataforma (RESEND_API_KEY / RESEND_FROM_EMAIL).
 */

const BRAND = "#ff5722";
const BRAND_DARK = "#1a0f08";

let client: Resend | null = null;
function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada");
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://falaai.cloud";
}

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
}

function render(heading: string, intro: string, ctaLabel: string, ctaUrl: string): string {
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:24px 12px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,0.08);">
    <tr><td style="background:linear-gradient(135deg,${BRAND_DARK} 0%,#2d1a10 100%);padding:26px 32px;">
      <div style="color:#fff;font-size:21px;font-weight:700;letter-spacing:-0.4px;">Synexa<span style="color:${BRAND};">.</span></div>
    </td></tr>
    <tr><td style="padding:30px 32px 8px;">
      <h1 style="margin:0 0 14px;font-size:20px;font-weight:700;color:#111827;">${heading}</h1>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#374151;">${intro}</p>
      <a href="${ctaUrl}" style="display:inline-block;background:${BRAND};color:#fff;padding:13px 26px;border-radius:9px;text-decoration:none;font-weight:600;font-size:15px;">${ctaLabel}</a>
      <p style="margin:22px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">Se o botão não funcionar, copie e cole no navegador:<br><span style="color:#6b7280;word-break:break-all;">${ctaUrl}</span></p>
    </td></tr>
    <tr><td style="padding:18px 32px 28px;">
      <p style="margin:0;font-size:13px;color:#9ca3af;">Se você não pediu isso, pode ignorar este e-mail com segurança.</p>
    </td></tr>
  </table>
</body></html>`;
}

async function send(to: string, subject: string, html: string): Promise<{ error?: string }> {
  try {
    const { error } = await getResend().emails.send({ from: fromAddress(), to, subject, html });
    if (error) {
      console.error("auth email falhou:", error);
      return { error: error.message };
    }
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao enviar e-mail";
    console.error("auth email lançou:", message);
    return { error: message };
  }
}

/** Manda o link de confirmação de e-mail (token de 24h). `next` volta pro fluxo após confirmar. */
export async function sendEmailVerification(
  target: { userId: string; email: string; fullName?: string | null },
  next?: string,
): Promise<{ error?: string }> {
  const token = await createAuthToken("email_verify", { userId: target.userId, email: target.email }, 60 * 24);
  const url = new URL(`${siteUrl()}/auth/confirm`);
  url.searchParams.set("token", token);
  if (next) url.searchParams.set("next", next);
  const nome = target.fullName?.split(" ")[0];
  return send(
    target.email,
    "Confirme seu e-mail — Synexa",
    render(
      `Bem-vindo${nome ? `, ${nome}` : ""}! 👋`,
      "Confirme seu e-mail pra ativar sua conta na Synexa. É só clicar no botão abaixo.",
      "Confirmar e-mail",
      url.toString(),
    ),
  );
}

/** Manda o link de redefinição de senha (token de 1h). */
export async function sendPasswordReset(target: { userId?: string; email: string }): Promise<{ error?: string }> {
  const token = await createAuthToken("password_reset", { userId: target.userId, email: target.email }, 60);
  const url = new URL(`${siteUrl()}/reset-password`);
  url.searchParams.set("token", token);
  return send(
    target.email,
    "Redefinir senha — Synexa",
    render(
      "Redefinir sua senha",
      "Recebemos um pedido pra redefinir a senha da sua conta. O link abaixo vale por 1 hora.",
      "Criar nova senha",
      url.toString(),
    ),
  );
}
