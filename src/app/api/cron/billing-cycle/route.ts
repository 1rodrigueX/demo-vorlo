import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/security/cronAuth";
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
  if (!verifyCronSecret(request, "billing-cycle")) {
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
              title: `Mensalidade Synexa CRM — ${tenant.name}`,
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
        subject: `Sua mensalidade do Synexa CRM já está disponível — ${tenant.name}`,
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

  // Mesmo ciclo de cobrança/carência da Transportadora, só que em
  // tenant_products (product='transportadora') em vez de tenants — os dois
  // produtos têm status independentes pro mesmo tenant.
  const { data: dueTransportadora } = await admin
    .from("tenant_products")
    .select("tenant_id, monthly_amount_cents")
    .eq("product", "transportadora")
    .eq("status", "active")
    .lte("next_billing_at", now.toISOString());

  let transportadoraCharged = 0;
  for (const row of dueTransportadora ?? []) {
    const { data: tenant } = await admin.from("tenants").select("name").eq("id", row.tenant_id).maybeSingle();
    const tenantName = tenant?.name ?? "Transportadora";
    const ownerEmail = await getTenantOwnerEmail(admin, row.tenant_id);
    if (!ownerEmail) {
      console.error("billing-cycle: tenant sem dono encontrado (transportadora)", row.tenant_id);
      continue;
    }

    try {
      const preference = new Preference(getMercadoPagoConfig());
      const result = await preference.create({
        body: {
          items: [
            {
              id: row.tenant_id,
              title: `Mensalidade Synexa Transportadora — ${tenantName}`,
              quantity: 1,
              currency_id: "BRL",
              unit_price: (row.monthly_amount_cents ?? 0) / 100,
            },
          ],
          payer: { email: ownerEmail },
          external_reference: `transportadora_renewal:${row.tenant_id}`,
          notification_url: `${siteUrl}/api/webhooks/mercadopago`,
          back_urls: {
            success: `${siteUrl}/app/download`,
            pending: `${siteUrl}/app/download`,
            failure: `${siteUrl}/app/download`,
          },
        },
      });

      if (!result.init_point) throw new Error("Preference sem init_point");

      await admin
        .from("tenant_products")
        .update({ status: "past_due", pending_payment_url: result.init_point })
        .eq("tenant_id", row.tenant_id)
        .eq("product", "transportadora");

      await sendBillingEmail({
        to: ownerEmail,
        subject: `Sua mensalidade da Transportadora já está disponível — ${tenantName}`,
        heading: "Hora de renovar sua assinatura",
        message: `A mensalidade da <strong>Transportadora</strong> já pode ser paga. Você tem ${GRACE_PERIOD_DAYS} dias antes do acesso no app ser suspenso.`,
        ctaLabel: "Pagar agora",
        ctaUrl: result.init_point,
      });

      transportadoraCharged++;
    } catch (err) {
      console.error("billing-cycle: falha ao gerar cobrança da transportadora pro tenant", row.tenant_id, err);
    }
  }

  const { data: overdueTransportadora } = await admin
    .from("tenant_products")
    .select("tenant_id")
    .eq("product", "transportadora")
    .eq("status", "past_due")
    .lte("next_billing_at", graceDeadline.toISOString());

  let transportadoraSuspended = 0;
  for (const row of overdueTransportadora ?? []) {
    const { data: tenant } = await admin.from("tenants").select("name").eq("id", row.tenant_id).maybeSingle();
    const tenantName = tenant?.name ?? "Transportadora";
    await admin
      .from("tenant_products")
      .update({ status: "suspended" })
      .eq("tenant_id", row.tenant_id)
      .eq("product", "transportadora");

    const ownerEmail = await getTenantOwnerEmail(admin, row.tenant_id);
    if (ownerEmail) {
      await sendBillingEmail({
        to: ownerEmail,
        subject: `Acesso ao app suspenso por falta de pagamento — ${tenantName}`,
        heading: "Seu acesso à Transportadora foi suspenso",
        message: `Não recebemos a confirmação do pagamento da <strong>Transportadora</strong> dentro do prazo. O acesso ao app foi suspenso até a regularização.`,
      }).catch((err) => console.error("billing-cycle: e-mail de suspensão (transportadora) falhou", row.tenant_id, err));
    }
    transportadoraSuspended++;
  }

  return NextResponse.json({ charged, suspended, transportadoraCharged, transportadoraSuspended });
}
