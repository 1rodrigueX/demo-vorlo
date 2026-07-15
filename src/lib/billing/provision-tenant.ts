import "server-only";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/email/resend";
import { DEFAULT_STAGES } from "@/lib/actions/tenants";

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
  companyName: string;
  ownerFullName: string;
  ownerEmail: string;
  extraSellers: number;
  extraManagers: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

/**
 * Cria o tenant + dono a partir de um checkout já pago (chamado só pelo
 * webhook do Stripe, depois da assinatura verificada — nunca exposto como
 * Server Action pública). Não faz rollback se falhar depois de criar o
 * tenant: o pagamento já aconteceu, então preferimos deixar o tenant
 * "órfão" pra reconciliação manual a perder o registro de quem pagou.
 */
export async function provisionTenantFromCheckout(
  params: ProvisionTenantParams,
): Promise<{ tenantId: string } | { error: string }> {
  const admin = createAdminClient();

  const { data: plan } = await admin.from("billing_plans").select("*").eq("is_default", true).maybeSingle();
  const includedSellers = plan?.included_sellers ?? 5;
  const includedManagers = plan?.included_managers ?? 2;

  const baseSlug = slugify(params.companyName);
  let tenantId: string | null = null;
  let lastError: string | undefined;

  for (let attempt = 0; attempt < 5 && !tenantId; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${randomBytes(2).toString("hex")}`;
    const { data: tenant, error } = await admin
      .from("tenants")
      .insert({
        name: params.companyName,
        slug,
        seller_limit: includedSellers + params.extraSellers,
        manager_limit: includedManagers + params.extraManagers,
        billing_plan_id: plan?.id ?? null,
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

  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email: params.ownerEmail,
    email_confirm: true,
    user_metadata: {
      full_name: params.ownerFullName,
      tenant_id: tenantId,
      role: "owner",
    },
  });

  if (userError || !created.user) {
    await admin.from("tenants").delete().eq("id", tenantId);
    return { error: `Não foi possível criar o dono do CRM: ${userError?.message ?? "erro desconhecido"}` };
  }

  await admin.from("pipeline_stages").insert(DEFAULT_STAGES.map((stage) => ({ ...stage, tenant_id: tenantId })));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: params.ownerEmail,
    options: { redirectTo: `${siteUrl}/auth/callback?next=/reset-password` },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error("provisionTenantFromCheckout: generateLink falhou (tenant já criado)", tenantId, linkError);
    return { error: "Empresa criada, mas não foi possível gerar o link de acesso. Verifique manualmente." };
  }

  try {
    await sendWelcomeEmail({
      to: params.ownerEmail,
      tenantName: params.companyName,
      ownerName: params.ownerFullName,
      setPasswordUrl: linkData.properties.action_link,
    });
  } catch (err) {
    console.error("provisionTenantFromCheckout: envio de e-mail falhou (tenant já criado)", tenantId, err);
    return { error: "Empresa criada, mas o e-mail de boas-vindas falhou. Verifique manualmente." };
  }

  return { tenantId };
}
