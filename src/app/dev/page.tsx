import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import { NewTenantButton } from "@/components/dev/NewTenantButton";
import { NewTransportadoraTenantButton } from "@/components/dev/NewTransportadoraTenantButton";
import { NewFinancasTenantButton } from "@/components/dev/NewFinancasTenantButton";
import { TenantStatusToggle } from "@/components/dev/TenantStatusToggle";
import { AccessTenantButton } from "@/components/dev/AccessTenantButton";

export default async function DevTenantsPage() {
  const admin = createAdminClient();
  const { data: tenants } = await admin
    .from("tenants")
    .select("id, name, slug, status, seller_limit, manager_limit, billing_plan_id, created_at")
    .order("created_at", { ascending: false });

  const { data: transportadoraProducts } = await admin
    .from("tenant_products")
    .select("tenant_id")
    .eq("product", "transportadora")
    .eq("status", "active");
  const transportadoraTenantIds = new Set((transportadoraProducts ?? []).map((p) => p.tenant_id));

  const { data: financasProducts } = await admin
    .from("tenant_products")
    .select("tenant_id")
    .eq("product", "financas")
    .eq("status", "active");
  const financasTenantIds = new Set((financasProducts ?? []).map((p) => p.tenant_id));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Empresas</h1>
          <p className="mt-1 text-sm text-gray-500">{tenants?.length ?? 0} empresas na plataforma.</p>
        </div>
        <div className="flex items-center gap-2">
          <NewTransportadoraTenantButton />
          <NewFinancasTenantButton />
          <NewTenantButton />
        </div>
      </div>

      {!tenants?.length ? (
        <Card className="p-8 text-center text-sm text-gray-500">Nenhuma empresa criada ainda.</Card>
      ) : (
        <Card className="divide-y divide-gray-100 overflow-hidden">
          {tenants.map((tenant) => {
            const hasCrm = !!tenant.billing_plan_id;
            const hasTransportadora = transportadoraTenantIds.has(tenant.id);
            const hasFinancas = financasTenantIds.has(tenant.id);
            return (
              <div key={tenant.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-gray-900">{tenant.name}</p>
                    {hasCrm && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                        CRM
                      </span>
                    )}
                    {hasTransportadora && (
                      <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700">
                        Transportadora
                      </span>
                    )}
                    {hasFinancas && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        Finanças
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-gray-500">
                    /{tenant.slug}
                    {hasCrm && ` · até ${tenant.seller_limit} vendedores, ${tenant.manager_limit} gestores`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                      tenant.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-500",
                    )}
                  >
                    {tenant.status === "active" ? "Ativo" : "Suspenso"}
                  </span>
                  {hasCrm && (
                    <>
                      <AccessTenantButton tenantId={tenant.id} />
                      <TenantStatusToggle tenantId={tenant.id} status={tenant.status} />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
