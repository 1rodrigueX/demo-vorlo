import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { provisionTenantFromCheckout } from "@/lib/billing/provision-tenant";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook não configurado" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook: assinatura inválida", err);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotência: a PK de stripe_webhook_events rejeita reprocessar o mesmo
  // evento numa reentrega do Stripe.
  const { error: dedupeError } = await admin.from("stripe_webhook_events").insert({ id: event.id });
  if (dedupeError) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata ?? {};

    if (!metadata.ownerEmail || !metadata.companyName) {
      console.error("Stripe webhook: checkout.session.completed sem metadata esperada", session.id);
      return NextResponse.json({ received: true });
    }

    const result = await provisionTenantFromCheckout({
      companyName: metadata.companyName,
      ownerFullName: metadata.ownerFullName ?? metadata.companyName,
      ownerEmail: metadata.ownerEmail,
      extraSellers: Number(metadata.extraSellers ?? 0),
      extraManagers: Number(metadata.extraManagers ?? 0),
      stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
      stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
    });

    if ("error" in result) {
      console.error("Stripe webhook: provisionamento falhou pra sessão", session.id, result.error);
    }
  }

  return NextResponse.json({ received: true });
}
