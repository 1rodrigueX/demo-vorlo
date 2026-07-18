"use server";

import { redirect } from "next/navigation";
import { Preference } from "mercadopago";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMercadoPagoConfig } from "@/lib/mercadopago/client";
import { transportadoraCheckoutSchema } from "@/lib/validation/transportadora-checkout";

export type ActionState = { error?: string } | null;

/**
 * Compra do produto Transportadora — mesmo papel de startCheckout (CRM), mas
 * mais simples (preço fixo, sem seats/extras) e ciente de dois casos: quem já
 * é dono de um tenant CRM está comprando um add-on (tenant_id preenchido,
 * sem precisar de company_name); quem nunca comprou nada precisa informar o
 * nome da empresa pra provisionar um tenant do zero (ver
 * provision-transportadora.ts).
 */
export async function startTransportadoraCheckout(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = transportadoraCheckoutSchema.safeParse({
    companyName: formData.get("companyName"),
    planId: formData.get("planId"),
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
    .from("transportadora_plans")
    .select("*")
    .eq("id", parsed.data.planId)
    .maybeSingle();
  if (!plan) return { error: "Plano não encontrado. Escolha um plano válido." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();
  const existingTenantId = profile?.tenant_id ?? null;

  if (!existingTenantId && !parsed.data.companyName) {
    return { error: "Informe o nome da sua empresa" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://45.149.153.20";
  const admin = createAdminClient();

  const { data: pendingCheckout, error: pendingError } = await admin
    .from("transportadora_pending_checkouts")
    .insert({
      user_id: user.id,
      tenant_id: existingTenantId,
      company_name: existingTenantId ? null : parsed.data.companyName,
      plan_id: plan.id,
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
            title: `Assinatura FALA AI Transportadora — ${plan.name}`,
            description: "Acesso ao app de gestão de fretes (Android)",
            quantity: 1,
            currency_id: "BRL",
            unit_price: plan.monthly_price_cents / 100,
          },
        ],
        payer: { email: user.email },
        external_reference: `transportadora_checkout:${pendingCheckout.id}`,
        notification_url: `${siteUrl}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${siteUrl}/compra/transportadora/sucesso`,
          pending: `${siteUrl}/compra/transportadora/sucesso`,
          failure: `${siteUrl}/comprar-transportadora`,
        },
        // Mesma restrição do checkout do CRM: auto_return só com back_urls em HTTPS.
        ...(siteUrl.startsWith("https://") ? { auto_return: "approved" } : {}),
      },
    });

    if (!result.init_point) return { error: "Não foi possível iniciar o pagamento" };
    checkoutUrl = result.init_point;
    await admin
      .from("transportadora_pending_checkouts")
      .update({ mp_preference_id: result.id })
      .eq("id", pendingCheckout.id);
  } catch (err) {
    console.error("startTransportadoraCheckout failed:", err);
    await admin.from("transportadora_pending_checkouts").delete().eq("id", pendingCheckout.id);
    return { error: "Não foi possível iniciar o pagamento. Tente novamente em instantes." };
  }

  if (!checkoutUrl) return { error: "Não foi possível iniciar o pagamento. Tente novamente em instantes." };
  redirect(checkoutUrl);
}

/**
 * Usado pelo polling de /compra/transportadora/sucesso. Não dá pra checar
 * "profile existe" como o checkProvisioningStatus do CRM faz — quem já é
 * dono de um CRM e está comprando a Transportadora como add-on já tem
 * profile antes mesmo do pagamento cair, então esse sinal daria falso
 * positivo. O sinal certo é o status da própria linha de staging.
 *
 * transportadora_pending_checkouts não tem policy de select pra
 * "authenticated" (só o service role escreve/lê, mesmo padrão de
 * pending_checkouts) — por isso usa o client admin aqui, mesmo sendo uma
 * Server Action chamada pelo próprio usuário.
 */
export async function checkTransportadoraProvisioningStatus(): Promise<{ ready: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ready: false };

  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("transportadora_pending_checkouts")
    .select("status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { ready: pending?.status === "completed" };
}

/** Cancela um checkout iniciado e não finalizado, liberando o usuário pra tentar de novo. */
export async function cancelPendingTransportadoraCheckout(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("transportadora_pending_checkouts")
    .delete()
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (error) return { error: "Não foi possível cancelar. Tente novamente." };
  return null;
}
