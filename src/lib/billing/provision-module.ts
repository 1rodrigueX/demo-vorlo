import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBillingEmail } from "@/lib/email/resend";
import { addOneMonth } from "@/lib/billing/cycle";
import { MODULE_CATALOG, isModuleKey } from "@/lib/billing/modules";
import { createStandaloneTenant } from "@/lib/billing/createStandaloneTenant";
import { notifyNewErpTenant } from "@/lib/discord/notify";

export type ProvisionModuleParams = {
  pendingCheckoutId: string;
  mpPaymentId: string | null;
  mpPayerId: string | null;
};

/**
 * Libera um módulo add-on (Finanças/Estoque/Produção) após pagamento aprovado
 * — chamado só pelo webhook do Mercado Pago. A concessão é um upsert em
 * tenant_products (que current_tenant_has_* já leem). Não faz rollback: o
 * pagamento já ocorreu, prefere reconciliação manual a perder o registro.
 */
export async function provisionModuleFromCheckout(
  params: ProvisionModuleParams,
): Promise<{ tenantId: string } | { error: string }> {
  const admin = createAdminClient();

  const { data: pending } = await admin
    .from("module_pending_checkouts")
    .select("*")
    .eq("id", params.pendingCheckoutId)
    .maybeSingle();
  if (!pending) return { error: `module_pending_checkouts não encontrado: ${params.pendingCheckoutId}` };
  if (pending.status === "completed") return { tenantId: pending.tenant_id ?? "" }; // reentrega do webhook
  if (!isModuleKey(pending.module)) return { error: `Módulo inválido no checkout: ${pending.module}` };

  let tenantId = pending.tenant_id;
  let isNewTenant = false;

  // Standalone (só o ERP por enquanto, ver MODULE_CATALOG): quem nunca teve
  // tenant paga o módulo sozinho — cria um tenant do zero, sem CRM (mesmo
  // molde de provision-transportadora.ts).
  if (!tenantId) {
    if (!MODULE_CATALOG[pending.module].standalone || !pending.company_name) {
      return { error: "Checkout inválido: módulo não permite compra standalone ou faltou o nome da empresa" };
    }
    const created = await createStandaloneTenant(admin, pending.user_id, pending.company_name);
    if ("error" in created) return created;
    tenantId = created.tenantId;
    isNewTenant = true;
  }

  const { error: productError } = await admin.from("tenant_products").upsert(
    {
      tenant_id: tenantId,
      product: pending.module,
      status: "active",
      mp_payer_id: params.mpPayerId,
      last_payment_id: params.mpPaymentId,
      monthly_amount_cents: pending.monthly_amount_cents,
      next_billing_at: addOneMonth(new Date()).toISOString(),
      activated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,product" },
  );
  if (productError) return { error: `Ativar o módulo falhou: ${productError.message}` };

  await admin.from("module_pending_checkouts").update({ status: "completed" }).eq("id", pending.id);

  const label = MODULE_CATALOG[pending.module].label;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://45.149.153.20";
  const { data: userResult } = await admin.auth.admin.getUserById(pending.user_id);
  const email = userResult.user?.email;
  if (email) {
    try {
      await sendBillingEmail({
        to: email,
        subject: `Seu acesso ao ${label} está liberado!`,
        heading: "Pagamento confirmado 🎉",
        message: `Sua assinatura do módulo <strong>${label}</strong> foi confirmada. Acesse pela sua central.`,
        ctaLabel: "Ir para a central",
        ctaUrl: `${siteUrl}/central`,
      });
    } catch (err) {
      console.error("provisionModuleFromCheckout: e-mail falhou (módulo já ativado)", tenantId, err);
    }
  }

  if (isNewTenant && pending.module === "erp") {
    const { data: notifiedTenant } = await admin.from("tenants").select("name, slug").eq("id", tenantId).maybeSingle();
    if (notifiedTenant) void notifyNewErpTenant(notifiedTenant.name, notifiedTenant.slug);
  }

  return { tenantId };
}
