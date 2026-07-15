"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/client";
import { calculateTotalCents } from "@/lib/billing/pricing";
import { checkoutSchema } from "@/lib/validation/checkout";

export type ActionState = { error?: string } | null;

export async function startCheckout(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = checkoutSchema.safeParse({
    companyName: formData.get("companyName"),
    ownerFullName: formData.get("ownerFullName"),
    ownerEmail: formData.get("ownerEmail"),
    extraSellers: formData.get("extraSellers"),
    extraManagers: formData.get("extraManagers"),
    extraAgents: formData.get("extraAgents"),
    extraIntegrations: formData.get("extraIntegrations"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { data: plan } = await supabase.from("billing_plans").select("*").eq("is_default", true).maybeSingle();
  if (!plan) return { error: "Nenhum plano configurado no momento. Tente novamente mais tarde." };

  const { totalCents } = calculateTotalCents(plan, parsed.data);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  let sessionUrl: string | null = null;
  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: parsed.data.ownerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: totalCents,
            recurring: { interval: "month" },
            product_data: {
              name: `Assinatura FALA AI CRM — ${plan.name}`,
              description: `${plan.included_sellers + parsed.data.extraSellers} vendedores, ${
                plan.included_managers + parsed.data.extraManagers
              } gestores, ${plan.included_agents + parsed.data.extraAgents} agentes de IA, ${
                parsed.data.extraIntegrations
              } integrações extras`,
            },
          },
        },
      ],
      success_url: `${siteUrl}/compra/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/?checkout=cancelado`,
      metadata: {
        companyName: parsed.data.companyName,
        ownerFullName: parsed.data.ownerFullName,
        ownerEmail: parsed.data.ownerEmail,
        extraSellers: String(parsed.data.extraSellers),
        extraManagers: String(parsed.data.extraManagers),
        extraAgents: String(parsed.data.extraAgents),
        extraIntegrations: String(parsed.data.extraIntegrations),
      },
    });

    if (!session.url) return { error: "Não foi possível iniciar o pagamento" };
    sessionUrl = session.url;
  } catch (err) {
    console.error("startCheckout failed:", err);
    return { error: "Não foi possível iniciar o pagamento. Tente novamente em instantes." };
  }

  redirect(sessionUrl);
}
