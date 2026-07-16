"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/client";
import { calculateTotalCents } from "@/lib/billing/pricing";
import { checkoutSchema } from "@/lib/validation/checkout";

export type ActionState = { error?: string } | null;

/**
 * Cria a intenção de compra (pending_checkouts) e a sessão do Stripe. Roda
 * só depois do usuário já estar autenticado (via /choose-plan — cadastro
 * agora vem antes do pagamento). Segredos como a chave da Anthropic ficam
 * só nessa tabela de staging (service-role), nunca no metadata do Stripe
 * nem no user_metadata do Supabase (esse último vira claim do JWT do
 * próprio usuário, legível no navegador).
 */
export async function startCheckout(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = checkoutSchema.safeParse({
    companyName: formData.get("companyName"),
    planId: formData.get("planId"),
    extraSellers: formData.get("extraSellers"),
    extraManagers: formData.get("extraManagers"),
    extraAgents: formData.get("extraAgents"),
    extraIntegrations: formData.get("extraIntegrations"),
    anthropicApiKey: formData.get("anthropicApiKey"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: "Sessão expirada, faça login novamente" };

  const { data: plan } = await supabase
    .from("billing_plans")
    .select("*")
    .eq("id", parsed.data.planId)
    .maybeSingle();
  if (!plan) return { error: "Plano não encontrado. Escolha um plano válido." };

  const { totalCents } = calculateTotalCents(plan, parsed.data);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const admin = createAdminClient();

  const { data: pendingCheckout, error: pendingError } = await admin
    .from("pending_checkouts")
    .insert({
      user_id: user.id,
      company_name: parsed.data.companyName,
      plan_id: plan.id,
      extra_sellers: parsed.data.extraSellers,
      extra_managers: parsed.data.extraManagers,
      extra_agents: parsed.data.extraAgents,
      extra_integrations: parsed.data.extraIntegrations,
      anthropic_api_key: parsed.data.anthropicApiKey ?? null,
    })
    .select("id")
    .single();

  if (pendingError || !pendingCheckout) {
    if (pendingError?.code === "23505") {
      return { error: "Você já tem uma compra em andamento. Aguarde ou cancele antes de tentar de novo." };
    }
    return { error: `Não foi possível iniciar o checkout: ${pendingError?.message ?? "erro desconhecido"}` };
  }

  let sessionUrl: string | null = null;
  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      client_reference_id: user.id,
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
      cancel_url: `${siteUrl}/choose-plan`,
      metadata: { pendingCheckoutId: pendingCheckout.id },
    });

    if (!session.url) return { error: "Não foi possível iniciar o pagamento" };
    sessionUrl = session.url;
    await admin.from("pending_checkouts").update({ stripe_session_id: session.id }).eq("id", pendingCheckout.id);
  } catch (err) {
    console.error("startCheckout failed:", err);
    await admin.from("pending_checkouts").delete().eq("id", pendingCheckout.id);
    return { error: "Não foi possível iniciar o pagamento. Tente novamente em instantes." };
  }

  if (!sessionUrl) return { error: "Não foi possível iniciar o pagamento. Tente novamente em instantes." };
  redirect(sessionUrl);
}

/** Usada pelo polling de /compra/sucesso — true assim que o webhook do Stripe já provisionou o tenant. */
export async function checkProvisioningStatus(): Promise<{ ready: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ready: false };

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  return { ready: !!profile };
}

/** Cancela um checkout iniciado e não finalizado, liberando o usuário pra tentar de novo com outro plano. */
export async function cancelPendingCheckout(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("pending_checkouts")
    .delete()
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (error) return { error: "Não foi possível cancelar. Tente novamente." };
  return null;
}
