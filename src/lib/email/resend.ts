import "server-only";
import { Resend } from "resend";

let client: Resend | null = null;

function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY não configurada");
  }
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

export async function sendWelcomeEmail({
  to,
  tenantName,
  ownerName,
  dashboardUrl,
}: {
  to: string;
  tenantName: string;
  ownerName: string;
  dashboardUrl: string;
}) {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Sua conta no Vorlo CRM está pronta, ${ownerName.split(" ")[0]}!`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #111827;">
        <h1 style="font-size: 20px;">Bem-vindo(a) ao Vorlo  🎉</h1>
        <p>Olá, ${ownerName}! O pagamento da assinatura da <strong>${tenantName}</strong> foi confirmado e seu CRM já está liberado.</p>
        <p>É só entrar com o e-mail e senha (ou Google) que você já usou pra criar sua conta:</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${dashboardUrl}" style="background:#4f46e5; color:#fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Acessar meu CRM</a>
        </p>
        <p style="color:#6b7280; font-size: 13px;">Se você não fez essa compra, ignore este e-mail.</p>
      </div>
    `,
  });

  if (error) {
    console.error("sendWelcomeEmail failed:", error);
    throw new Error(`Não foi possível enviar o e-mail de boas-vindas: ${error.message}`);
  }
}

/** Template genérico pros e-mails de cobrança mensal (aviso, confirmação, suspensão). */
export async function sendBillingEmail({
  to,
  subject,
  heading,
  message,
  ctaLabel,
  ctaUrl,
}: {
  to: string;
  subject: string;
  heading: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #111827;">
        <h1 style="font-size: 20px;">${heading}</h1>
        <p>${message}</p>
        ${
          ctaLabel && ctaUrl
            ? `<p style="text-align: center; margin: 24px 0;">
                <a href="${ctaUrl}" style="background:#4f46e5; color:#fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">${ctaLabel}</a>
              </p>`
            : ""
        }
      </div>
    `,
  });

  if (error) {
    console.error("sendBillingEmail failed:", error);
    throw new Error(`Não foi possível enviar o e-mail de cobrança: ${error.message}`);
  }
}
