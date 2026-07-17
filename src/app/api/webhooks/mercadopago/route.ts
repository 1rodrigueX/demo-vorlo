import { NextResponse } from "next/server";
import { Payment, WebhookSignatureValidator, InvalidWebhookSignatureError } from "mercadopago";
import { getMercadoPagoConfig } from "@/lib/mercadopago/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { provisionTenantFromCheckout } from "@/lib/billing/provision-tenant";
import { addOneMonth } from "@/lib/billing/cycle";
import { getTenantOwnerEmail } from "@/lib/billing/tenant-owner";
import { sendBillingEmail } from "@/lib/email/resend";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook não configurado" }, { status: 500 });
  }

  try {
    WebhookSignatureValidator.validate({
      xSignature: signature,
      xRequestId: requestId,
      dataId,
      secret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
    });
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) {
      console.error("Mercado Pago webhook: assinatura inválida", err.reason);
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
    }
    throw err;
  }

  const body = await request.json().catch(() => null);
  const paymentId = body?.data?.id ?? dataId;
  const topic = body?.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");

  if (topic !== "payment" || !paymentId) {
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();

  // Idempotência: a PK de mercadopago_webhook_events rejeita reprocessar o
  // mesmo pagamento numa reentrega do Mercado Pago.
  const { error: dedupeError } = await admin.from("mercadopago_webhook_events").insert({ id: String(paymentId) });
  if (dedupeError) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const payment = new Payment(getMercadoPagoConfig());
  const paymentData = await payment.get({ id: paymentId });

  if (paymentData.status !== "approved") {
    return NextResponse.json({ received: true });
  }

  const externalReference = paymentData.external_reference ?? "";
  const payerId = paymentData.payer?.id ? String(paymentData.payer.id) : null;

  if (externalReference.startsWith("checkout:")) {
    const pendingCheckoutId = externalReference.slice("checkout:".length);
    const result = await provisionTenantFromCheckout({
      pendingCheckoutId,
      mpPaymentId: String(paymentData.id),
      mpPayerId: payerId,
    });
    if ("error" in result) {
      console.error("Mercado Pago webhook: provisionamento falhou pro pagamento", paymentId, result.error);
    }
  } else if (externalReference.startsWith("renewal:")) {
    const tenantId = externalReference.slice("renewal:".length);
    const { data: tenant } = await admin
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .maybeSingle();

    await admin
      .from("tenants")
      .update({
        status: "active",
        next_billing_at: addOneMonth(new Date()).toISOString(),
        last_payment_id: String(paymentData.id),
        pending_payment_url: null,
      })
      .eq("id", tenantId);

    if (tenant) {
      const ownerEmail = await getTenantOwnerEmail(admin, tenantId);
      if (ownerEmail) {
        await sendBillingEmail({
          to: ownerEmail,
          subject: `Pagamento confirmado — ${tenant.name}`,
          heading: "Pagamento confirmado ✅",
          message: `A mensalidade da <strong>${tenant.name}</strong> foi confirmada. Seu CRM continua liberado normalmente.`,
        }).catch((err) => console.error("Mercado Pago webhook: e-mail de confirmação falhou", err));
      }
    }
  }

  return NextResponse.json({ received: true });
}
