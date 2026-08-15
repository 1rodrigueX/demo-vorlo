import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBillingEmail } from "@/lib/email/resend";
import { addOneMonth } from "@/lib/billing/cycle";
import { notifyNewTransportadoraTenant } from "@/lib/discord/notify";
import { createStandaloneTenant } from "@/lib/billing/createStandaloneTenant";

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

  if (!tenantId) {
    const created = await createStandaloneTenant(admin, pending.user_id, pending.company_name ?? "Empresa");
    if ("error" in created) return created;
    tenantId = created.tenantId;
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

  const { data: notifiedTenant } = await admin.from("tenants").select("name, slug").eq("id", tenantId).maybeSingle();
  if (notifiedTenant) void notifyNewTransportadoraTenant(notifiedTenant.name, notifiedTenant.slug);

  const { data: userResult } = await admin.auth.admin.getUserById(pending.user_id);
  const email = userResult.user?.email;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  if (email) {
    try {
      await sendBillingEmail({
        to: email,
        subject: "Seu acesso ao Vorlo Transportadora está liberado!",
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
