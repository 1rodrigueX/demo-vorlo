"use server";

import { redirect } from "next/navigation";
import { Preference } from "mercadopago";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMercadoPagoConfig } from "@/lib/mercadopago/client";
import { calculateTotalCents } from "@/lib/billing/pricing";
import { checkoutSchema } from "@/lib/validation/checkout";

export type ActionState = { error?: string } | null;

/**
 * Cria a intenção de compra (pending_checkouts) e a Preference do Mercado
 * Pago (Checkout Pro). Roda só depois do usuário já estar autenticado (via
 * /choose-plan — cadastro agora vem antes do pagamento). Segredos como a
 * chave da OpenAI ficam só nessa tabela de staging (service-role), nunca
 * no metadata do Mercado Pago nem no user_metadata do Supabase (esse último
 * vira claim do JWT do próprio usuário, legível no navegador).
 */
export async function startCheckout(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = checkoutSchema.safeParse({
    companyName: formData.get("companyName"),
    planId: formData.get("planId"),
    extraSellers: formData.get("extraSellers"),
    extraManagers: formData.get("extraManagers"),
    extraAgents: formData.get("extraAgents"),
    extraIntegrations: formData.get("extraIntegrations"),
    openaiApiKey: formData.get("openaiApiKey"),
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://45.149.153.20";
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
      openai_api_key: parsed.data.openaiApiKey ?? null,
    })
    .select("id")
    .single();

  if (pendingError || !pendingCheckout) {
    if (pendingError?.code === "23505") {
      return { error: "Você já tem uma compra em andamento. Aguarde ou cancele antes de tentar de novo." };
    }
    return { error: `Não foi possível iniciar o checkout: ${pendingError?.message ?? "erro desconhecido"}` };
  }

  let checkoutUrl: string | null = null;
  try {
    const preference = new Preference(getMercadoPagoConfig());
    const result = await preference.create({
      body: {
        items: [
          {
            id: plan.id,
            title: `Assinatura Vorlo CRM — ${plan.name}`,
            description: `${plan.included_sellers + parsed.data.extraSellers} vendedores, ${
              plan.included_managers + parsed.data.extraManagers
            } gestores, ${plan.included_agents + parsed.data.extraAgents} agentes de IA, ${
              parsed.data.extraIntegrations
            } integrações extras`,
            quantity: 1,
            currency_id: "BRL",
            unit_price: totalCents / 100,
          },
        ],
        payer: { email: user.email },
        external_reference: `checkout:${pendingCheckout.id}`,
        notification_url: `${siteUrl}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${siteUrl}/compra/sucesso`,
          pending: `${siteUrl}/compra/sucesso`,
          failure: `${siteUrl}/choose-plan`,
        },
        // O Mercado Pago só aceita auto_return com back_urls em HTTPS — em
        // HTTP (localhost em dev, ou o IP puro da VPS antes de ter domínio +
        // certificado) ele rejeita a Preference inteira, então só manda
        // quando der pra confiar que vai funcionar.
        ...(siteUrl.startsWith("https://") ? { auto_return: "approved" } : {}),
      },
    });

    if (!result.init_point) return { error: "Não foi possível iniciar o pagamento" };
    checkoutUrl = result.init_point;
    await admin.from("pending_checkouts").update({ mp_preference_id: result.id }).eq("id", pendingCheckout.id);
  } catch (err) {
    console.error("startCheckout failed:", err);
    await admin.from("pending_checkouts").delete().eq("id", pendingCheckout.id);
    return { error: "Não foi possível iniciar o pagamento. Tente novamente em instantes." };
  }

  if (!checkoutUrl) return { error: "Não foi possível iniciar o pagamento. Tente novamente em instantes." };
  redirect(checkoutUrl);
}

/** Usada pelo polling de /compra/sucesso — true assim que o webhook do Mercado Pago já provisionou o tenant. */
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
