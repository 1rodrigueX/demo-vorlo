import { NextResponse } from "next/server";
import { Preference } from "mercadopago";
import { getMercadoPagoConfig } from "@/lib/mercadopago/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantOwnerEmail } from "@/lib/billing/tenant-owner";
import { sendBillingEmail } from "@/lib/email/resend";

const GRACE_PERIOD_DAYS = 5;

/**
 * Cobrança mensal: o Mercado Pago não tem assinatura automática com PIX/boleto
 * (só cartão via Preapproval), então todo ciclo geramos uma Preference nova e
 * avisamos o dono por e-mail. Chamado 1x/dia por um cron externo na VPS
 * (crontab), autenticado por segredo compartilhado — não tem sessão de
 * usuário nesse fluxo.
 */
export async function POST(request: Request) {
  const cronSecret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://45.149.153.20";
  const now = new Date();

  const { data: dueTenants } = await admin
    .from("tenants")
    .select("id, name, monthly_amount_cents")
    .eq("status", "active")
    .lte("next_billing_at", now.toISOString());

  let charged = 0;
  for (const tenant of dueTenants ?? []) {
    const ownerEmail = await getTenantOwnerEmail(admin, tenant.id);
    if (!ownerEmail) {
      console.error("billing-cycle: tenant sem dono encontrado", tenant.id);
      continue;
    }

    try {
      const preference = new Preference(getMercadoPagoConfig());
      const result = await preference.create({
        body: {
          items: [
            {
              id: tenant.id,
              title: `Mensalidade FALA AI CRM — ${tenant.name}`,
              quantity: 1,
              currency_id: "BRL",
              unit_price: (tenant.monthly_amount_cents ?? 0) / 100,
            },
          ],
          payer: { email: ownerEmail },
          external_reference: `renewal:${tenant.id}`,
          notification_url: `${siteUrl}/api/webhooks/mercadopago`,
          back_urls: {
            success: `${siteUrl}/dashboard`,
            pending: `${siteUrl}/dashboard`,
            failure: `${siteUrl}/dashboard`,
          },
        },
      });

      if (!result.init_point) throw new Error("Preference sem init_point");

      await admin
        .from("tenants")
        .update({ status: "past_due", pending_payment_url: result.init_point })
        .eq("id", tenant.id);

      await sendBillingEmail({
        to: ownerEmail,
        subject: `Sua mensalidade do FALA AI CRM já está disponível — ${tenant.name}`,
        heading: "Hora de renovar sua assinatura",
        message: `A mensalidade da <strong>${tenant.name}</strong> já pode ser paga. Você tem ${GRACE_PERIOD_DAYS} dias antes do acesso ser suspenso.`,
        ctaLabel: "Pagar agora",
        ctaUrl: result.init_point,
      });

      charged++;
    } catch (err) {
      console.error("billing-cycle: falha ao gerar cobrança pro tenant", tenant.id, err);
    }
  }

  const graceDeadline = new Date(now.getTime() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const { data: overdueTenants } = await admin
    .from("tenants")
    .select("id, name")
    .eq("status", "past_due")
    .lte("next_billing_at", graceDeadline.toISOString());

  let suspended = 0;
  for (const tenant of overdueTenants ?? []) {
    await admin.from("tenants").update({ status: "suspended" }).eq("id", tenant.id);

    const ownerEmail = await getTenantOwnerEmail(admin, tenant.id);
    if (ownerEmail) {
      await sendBillingEmail({
        to: ownerEmail,
        subject: `CRM suspenso por falta de pagamento — ${tenant.name}`,
        heading: "Seu CRM foi suspenso",
        message: `Não recebemos a confirmação do pagamento da <strong>${tenant.name}</strong> dentro do prazo. O acesso foi suspenso até a regularização.`,
      }).catch((err) => console.error("billing-cycle: e-mail de suspensão falhou", tenant.id, err));
    }
    suspended++;
  }

  return NextResponse.json({ charged, suspended });
}
