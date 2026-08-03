"use server";

import { redirect } from "next/navigation";
import { Preference } from "mercadopago";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMercadoPagoConfig } from "@/lib/mercadopago/client";
import { MODULE_CATALOG, isModuleKey } from "@/lib/billing/modules";

export type ActionState = { error?: string } | null;

/**
 * Compra de um módulo add-on (Finanças / Estoque / Produção). Sempre add-on de
 * um tenant existente — o usuário já tem conta. Cria uma linha de staging em
 * module_pending_checkouts e uma preference do Mercado Pago; a concessão do
 * acesso (upsert em tenant_products) acontece no webhook, após o pagamento.
 */
export async function startModuleCheckout(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const moduleRaw = formData.get("module");
  const moduleValue = typeof moduleRaw === "string" ? moduleRaw : "";
  if (!isModuleKey(moduleValue)) {
    return { error: "Módulo inválido" };
  }
  const moduleKey = moduleValue;
  const catalog = MODULE_CATALOG[moduleKey];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: "Sessão expirada, faça login novamente" };

  const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).maybeSingle();
  const tenantId = profile?.tenant_id ?? null;
  if (!tenantId) {
    return { error: "Crie sua conta primeiro para assinar este módulo." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://45.149.153.20";
  const admin = createAdminClient();

  const { data: pending, error: pendingError } = await admin
    .from("module_pending_checkouts")
    .insert({
      user_id: user.id,
      tenant_id: tenantId,
      module: moduleKey,
      monthly_amount_cents: catalog.priceCents,
    })
    .select("id")
    .single();

  if (pendingError || !pending) {
    if (pendingError?.code === "23505") {
      return { error: "Você já tem uma compra desse módulo em andamento. Aguarde ou tente de novo em instantes." };
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
            id: moduleKey,
            title: `Assinatura Synexa ${catalog.label}`,
            description: `Acesso ao módulo ${catalog.label}`,
            quantity: 1,
            currency_id: "BRL",
            unit_price: catalog.priceCents / 100,
          },
        ],
        payer: { email: user.email },
        external_reference: `module_checkout:${pending.id}`,
        notification_url: `${siteUrl}/api/webhooks/mercadopago`,
        back_urls: {
          success: `${siteUrl}/compra/modulo/sucesso?m=${moduleKey}`,
          pending: `${siteUrl}/compra/modulo/sucesso?m=${moduleKey}`,
          failure: `${siteUrl}/comprar-${moduleKey}`,
        },
        ...(siteUrl.startsWith("https://") ? { auto_return: "approved" } : {}),
      },
    });

    if (!result.init_point) return { error: "Não foi possível iniciar o pagamento" };
    checkoutUrl = result.init_point;
    await admin.from("module_pending_checkouts").update({ mp_preference_id: result.id }).eq("id", pending.id);
  } catch (err) {
    console.error("startModuleCheckout failed:", err);
    await admin.from("module_pending_checkouts").delete().eq("id", pending.id);
    return { error: "Não foi possível iniciar o pagamento. Tente novamente em instantes." };
  }

  if (!checkoutUrl) return { error: "Não foi possível iniciar o pagamento. Tente novamente em instantes." };
  redirect(checkoutUrl);
}

/** Polling da página de sucesso: confirma se o módulo já foi liberado. */
export async function checkModuleProvisioningStatus(module: string): Promise<{ ready: boolean }> {
  if (!isModuleKey(module)) return { ready: false };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ready: false };

  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("module_pending_checkouts")
    .select("status")
    .eq("user_id", user.id)
    .eq("module", module)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { ready: pending?.status === "completed" };
}

/** Cancela um checkout pendente do módulo, liberando pra tentar de novo. */
export async function cancelPendingModuleCheckout(module: string): Promise<ActionState> {
  if (!isModuleKey(module)) return { error: "Módulo inválido" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("module_pending_checkouts")
    .delete()
    .eq("user_id", user.id)
    .eq("module", module)
    .eq("status", "pending");

  if (error) return { error: "Não foi possível cancelar. Tente novamente." };
  return null;
}
