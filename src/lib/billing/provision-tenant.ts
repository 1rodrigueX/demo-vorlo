import "server-only";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/email/resend";
import { testAnthropicApiKey } from "@/lib/anthropic/client";

const DEFAULT_STAGES = [
  { name: "Novo", position: 1, color: "#6366f1", is_won: false, is_lost: false },
  { name: "Contato", position: 2, color: "#0ea5e9", is_won: false, is_lost: false },
  { name: "Proposta", position: 3, color: "#f59e0b", is_won: false, is_lost: false },
  { name: "Fechado", position: 4, color: "#22c55e", is_won: true, is_lost: false },
] as const;

const DIACRITIC_MARKS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(DIACRITIC_MARKS_REGEX, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "empresa"
  );
}

export type ProvisionTenantParams = {
  pendingCheckoutId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

/**
 * Transforma um usuário já autenticado (cadastro via Google ou e-mail/senha,
 * sem tenant ainda) num dono de CRM, a partir de um checkout já pago
 * (chamado só pelo webhook do Stripe, depois da assinatura verificada —
 * nunca exposto como Server Action pública). O usuário e a intenção de
 * compra (empresa, plano, extras, chave da Anthropic opcional) já existem
 * antes de chegar aqui — ver src/lib/actions/checkout.ts. Não faz rollback
 * se falhar depois de criar o tenant: o pagamento já aconteceu, então
 * preferimos deixar o tenant "órfão" pra reconciliação manual a perder o
 * registro de quem pagou.
 */
export async function provisionTenantFromCheckout(
  params: ProvisionTenantParams,
): Promise<{ tenantId: string } | { error: string }> {
  const admin = createAdminClient();

  const { data: pending } = await admin
    .from("pending_checkouts")
    .select("*")
    .eq("id", params.pendingCheckoutId)
    .maybeSingle();
  if (!pending) return { error: `pending_checkouts não encontrado: ${params.pendingCheckoutId}` };
  if (pending.status === "completed") return { tenantId: "" }; // reentrega do webhook, já provisionado

  const { data: userResult, error: userLookupError } = await admin.auth.admin.getUserById(pending.user_id);
  if (userLookupError || !userResult.user) {
    return { error: `Usuário do checkout não encontrado: ${userLookupError?.message ?? pending.user_id}` };
  }
  const user = userResult.user;
  const ownerFullName = (user.user_metadata?.full_name as string | undefined) || pending.company_name;

  const { data: plan } = await admin.from("billing_plans").select("*").eq("id", pending.plan_id).maybeSingle();
  const includedSellers = plan?.included_sellers ?? 0;
  const includedManagers = plan?.included_managers ?? 0;

  const baseSlug = slugify(pending.company_name);
  let tenantId: string | null = null;
  let lastError: string | undefined;

  for (let attempt = 0; attempt < 5 && !tenantId; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${randomBytes(2).toString("hex")}`;
    const { data: tenant, error } = await admin
      .from("tenants")
      .insert({
        name: pending.company_name,
        slug,
        seller_limit: includedSellers + pending.extra_sellers,
        manager_limit: includedManagers + pending.extra_managers,
        billing_plan_id: pending.plan_id,
        stripe_customer_id: params.stripeCustomerId,
        stripe_subscription_id: params.stripeSubscriptionId,
      })
      .select("id")
      .single();

    if (tenant) {
      tenantId = tenant.id;
    } else if (error?.code === "23505") {
      lastError = error.message;
      continue;
    } else {
      return { error: `Não foi possível criar a empresa: ${error?.message ?? "erro desconhecido"}` };
    }
  }

  if (!tenantId) {
    return { error: `Não foi possível gerar um slug único: ${lastError ?? "erro desconhecido"}` };
  }

  // Merge raso: updateUserById só sobrescreve as chaves passadas, preserva
  // full_name/avatar (do Google, se foi esse o cadastro).
  const { error: updateUserError } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { tenant_id: tenantId, role: "owner" },
  });
  if (updateUserError) {
    return { error: `Não foi possível vincular o usuário ao tenant: ${updateUserError.message}` };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: user.id,
    full_name: ownerFullName,
    tenant_id: tenantId,
    role: "owner",
  });
  if (profileError) {
    return { error: `Empresa criada, mas o profile falhou: ${profileError.message}` };
  }

  await admin.from("pipeline_stages").insert(DEFAULT_STAGES.map((stage) => ({ ...stage, tenant_id: tenantId })));

  if (pending.anthropic_api_key) {
    const test = await testAnthropicApiKey(pending.anthropic_api_key);
    const now = new Date().toISOString();
    await admin.from("tenant_integrations").insert({
      tenant_id: tenantId,
      provider: "anthropic",
      credentials: { apiKey: pending.anthropic_api_key },
      status: test.ok ? "connected" : "error",
      connected_at: test.ok ? now : null,
      last_tested_at: now,
      last_error: test.ok ? null : test.error,
    });
  }

  await admin
    .from("pending_checkouts")
    .update({ status: "completed", anthropic_api_key: null })
    .eq("id", pending.id);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    await sendWelcomeEmail({
      to: user.email!,
      tenantName: pending.company_name,
      ownerName: ownerFullName,
      dashboardUrl: `${siteUrl}/dashboard`,
    });
  } catch (err) {
    console.error("provisionTenantFromCheckout: envio de e-mail falhou (tenant já criado)", tenantId, err);
  }

  return { tenantId };
}
