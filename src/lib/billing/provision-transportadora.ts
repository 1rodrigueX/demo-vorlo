import "server-only";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBillingEmail } from "@/lib/email/resend";
import { addOneMonth } from "@/lib/billing/cycle";
import { isReservedSlug } from "@/lib/tenant/reserved-slugs";

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

export type ProvisionTransportadoraParams = {
  pendingCheckoutId: string;
  mpPaymentId: string | null;
  mpPayerId: string | null;
};

/**
 * Libera o acesso à Transportadora depois de um pagamento aprovado (chamado
 * só pelo webhook do Mercado Pago). Dois caminhos, dependendo do que
 * startTransportadoraCheckout gravou no pending:
 *
 *  - tenant_id preenchido: já é dono de um tenant (comprou o CRM antes, ou
 *    está comprando os dois juntos) — só ativa o produto nesse tenant.
 *  - tenant_id nulo: nunca teve tenant — precisa criar um do zero (mesmo
 *    fluxo de provision-tenant.ts, mas sem billing_plan_id: esse tenant não
 *    tem CRM, só Transportadora).
 *
 * Não faz rollback se falhar no meio: o pagamento já aconteceu, prefere
 * deixar pra reconciliação manual a perder o registro de quem pagou.
 */
export async function provisionTransportadoraFromCheckout(
  params: ProvisionTransportadoraParams,
): Promise<{ tenantId: string } | { error: string }> {
  const admin = createAdminClient();

  const { data: pending } = await admin
    .from("transportadora_pending_checkouts")
    .select("*")
    .eq("id", params.pendingCheckoutId)
    .maybeSingle();
  if (!pending) {
    return { error: `transportadora_pending_checkouts não encontrado: ${params.pendingCheckoutId}` };
  }
  if (pending.status === "completed") return { tenantId: pending.tenant_id ?? "" }; // reentrega do webhook

  const { data: plan } = await admin
    .from("transportadora_plans")
    .select("*")
    .eq("id", pending.plan_id)
    .maybeSingle();
  const monthlyAmountCents = plan?.monthly_price_cents ?? 0;

  let tenantId = pending.tenant_id;
  let ownerFullName: string | null = null;

  if (!tenantId) {
    const { data: userResult, error: userLookupError } = await admin.auth.admin.getUserById(pending.user_id);
    if (userLookupError || !userResult.user) {
      return { error: `Usuário do checkout não encontrado: ${userLookupError?.message ?? pending.user_id}` };
    }
    const user = userResult.user;
    ownerFullName = (user.user_metadata?.full_name as string | undefined) || pending.company_name || "Dono";

    const baseSlug = slugify(pending.company_name ?? "empresa");
    let lastError: string | undefined;

    for (let attempt = 0; attempt < 5 && !tenantId; attempt++) {
      const slug =
        attempt === 0 && !isReservedSlug(baseSlug) ? baseSlug : `${baseSlug}-${randomBytes(2).toString("hex")}`;
      const { data: tenant, error } = await admin
        .from("tenants")
        .insert({ name: pending.company_name ?? "Empresa", slug })
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
  }

  const { error: productError } = await admin.from("tenant_products").upsert(
    {
      tenant_id: tenantId,
      product: "transportadora",
      status: "active",
      plan_id: pending.plan_id,
      mp_payer_id: params.mpPayerId,
      last_payment_id: params.mpPaymentId,
      monthly_amount_cents: monthlyAmountCents,
      next_billing_at: addOneMonth(new Date()).toISOString(),
      activated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,product" },
  );
  if (productError) {
    return { error: `Tenant pronto, mas ativar o produto falhou: ${productError.message}` };
  }

  // fator_imposto default (0.85) — o app Flutter espera essa linha existir
  // no primeiro login, não cria sozinho (fica só ajustando, nunca inserindo).
  await admin.from("transportadora_configuracoes").upsert({ tenant_id: tenantId }, { onConflict: "tenant_id" });

  await admin
    .from("transportadora_pending_checkouts")
    .update({ status: "completed" })
    .eq("id", pending.id);

  const { data: userResult } = await admin.auth.admin.getUserById(pending.user_id);
  const email = userResult.user?.email;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://45.149.153.20";
  if (email) {
    try {
      await sendBillingEmail({
        to: email,
        subject: "Seu acesso ao FALA AI Transportadora está liberado!",
        heading: "Pagamento confirmado 🎉",
        message:
          "Sua assinatura da <strong>Transportadora</strong> foi confirmada. Baixe o app no Android e entre com o mesmo e-mail e senha (ou Google) que você usa aqui no site.",
        ctaLabel: "Baixar o app",
        ctaUrl: `${siteUrl}/app/download`,
      });
    } catch (err) {
      console.error("provisionTransportadoraFromCheckout: envio de e-mail falhou (tenant já criado)", tenantId, err);
    }
  }

  return { tenantId };
}
