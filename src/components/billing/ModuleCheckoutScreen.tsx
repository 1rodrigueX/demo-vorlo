import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveHomeRoute } from "@/lib/auth/current-user";
import { MODULE_CATALOG, type ModuleKey } from "@/lib/billing/modules";
import { ModuleCheckoutForm, ActiveModuleCheckoutNotice } from "@/components/billing/ModuleCheckoutForm";

const STALE_CHECKOUT_MS = 30 * 60 * 1000;

function staleCheckoutThreshold(): string {
  return new Date(Date.now() - STALE_CHECKOUT_MS).toISOString();
}

const HAS_RPC = {
  financas: "current_tenant_has_financas",
  estoque: "current_tenant_has_estoque",
  producao: "current_tenant_has_producao",
} as const;

/**
 * Tela de compra de um módulo add-on. Exige login e um tenant existente (é
 * add-on de quem já tem conta). Se o módulo já está ativo, manda pra central;
 * se há um checkout pendente, mostra o aviso; senão, o formulário de assinatura.
 */
export async function ModuleCheckoutScreen({ module }: { module: ModuleKey }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: hasAccess } = await supabase.rpc(HAS_RPC[module]);
  if (hasAccess) redirect("/central");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  // Módulo é add-on de um tenant existente — quem ainda não tem conta/CRM
  // precisa criar uma primeiro.
  if (!profile?.tenant_id) redirect("/choose-plan");

  const catalog = MODULE_CATALOG[module];
  const admin = createAdminClient();

  // Limpa tentativa pendente velha (checkout abandonado) antes de checar.
  await admin
    .from("module_pending_checkouts")
    .delete()
    .eq("user_id", user.id)
    .eq("module", module)
    .eq("status", "pending")
    .lt("created_at", staleCheckoutThreshold());

  const { data: activePending } = await admin
    .from("module_pending_checkouts")
    .select("id")
    .eq("user_id", user.id)
    .eq("module", module)
    .eq("status", "pending")
    .maybeSingle();

  const laterHref = await resolveHomeRoute();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      {activePending ? (
        <ActiveModuleCheckoutNotice module={module} />
      ) : (
        <ModuleCheckoutForm
          module={module}
          label={catalog.label}
          priceCents={catalog.priceCents}
          laterHref={laterHref}
          ownerName={profile.full_name ?? null}
        />
      )}
    </div>
  );
}
