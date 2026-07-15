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
  setPasswordUrl,
}: {
  to: string;
  tenantName: string;
  ownerName: string;
  setPasswordUrl: string;
}) {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Sua conta no FALA AI CRM está pronta, ${ownerName.split(" ")[0]}!`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #111827;">
        <h1 style="font-size: 20px;">Bem-vindo(a) ao FALA AI CRM 🎉</h1>
        <p>Olá, ${ownerName}! O pagamento da assinatura da <strong>${tenantName}</strong> foi confirmado e seu CRM já está pronto.</p>
        <p><strong>Seu login:</strong> ${to}</p>
        <p>Clique no botão abaixo pra criar sua senha e acessar pela primeira vez (o link expira em algumas horas):</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${setPasswordUrl}" style="background:#4f46e5; color:#fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Criar minha senha</a>
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
