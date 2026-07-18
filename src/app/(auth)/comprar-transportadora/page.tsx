import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveHomeRoute } from "@/lib/auth/current-user";
import {
  TransportadoraCheckoutForm,
  ActiveTransportadoraCheckoutNotice,
} from "@/components/billing/TransportadoraCheckoutForm";

const STALE_CHECKOUT_MS = 30 * 60 * 1000;

function staleCheckoutThreshold(): string {
  return new Date(Date.now() - STALE_CHECKOUT_MS).toISOString();
}

/**
 * Página de compra da Transportadora — ao contrário de /choose-plan, NÃO
 * redireciona embora quem já tem `profiles` (dono de CRM pode chegar aqui
 * pra comprar o add-on). Só pula pra frente se o tenant já tiver o produto
 * ativo (current_tenant_has_transportadora()).
 */
export default async function ComprarTransportadoraPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: hasAccess } = await supabase.rpc("current_tenant_has_transportadora");
  if (hasAccess) redirect("/app/download");

  const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).maybeSingle();
  const hasExistingTenant = !!profile?.tenant_id;

  const admin = createAdminClient();

  const staleThreshold = staleCheckoutThreshold();
  await admin
    .from("transportadora_pending_checkouts")
    .delete()
    .eq("user_id", user.id)
    .eq("status", "pending")
    .lt("created_at", staleThreshold);

  const { data: activeCheckout } = await admin
    .from("transportadora_pending_checkouts")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  const { data: plan } = await supabase
    .from("transportadora_plans")
    .select("*")
    .eq("is_default", true)
    .maybeSingle();

  const ownerName = (user.user_metadata?.full_name as string | undefined) ?? null;
  // Sem tenant: manda pra /choose-plan (resolveHomeRoute cai nesse caso
  // sozinho). Já tem CRM: manda de volta pro dashboard de onde provavelmente
  // veio.
  const laterHref = await resolveHomeRoute();

  if (activeCheckout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <ActiveTransportadoraCheckoutNotice />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <p className="text-sm text-red-600">
          Não foi possível carregar o plano agora. Tente novamente em instantes.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <TransportadoraCheckoutForm
        planId={plan.id}
        planName={plan.name}
        monthlyPriceCents={plan.monthly_price_cents}
        hasExistingTenant={hasExistingTenant}
        ownerName={ownerName}
        laterHref={laterHref}
      />
    </div>
  );
}
