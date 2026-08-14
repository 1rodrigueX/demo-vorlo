import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import { NewTenantButton } from "@/components/dev/NewTenantButton";
import { NewTransportadoraTenantButton } from "@/components/dev/NewTransportadoraTenantButton";
import { NewFinancasTenantButton } from "@/components/dev/NewFinancasTenantButton";
import { NewEstoqueTenantButton } from "@/components/dev/NewEstoqueTenantButton";
import { NewProducaoTenantButton } from "@/components/dev/NewProducaoTenantButton";
import { NewErpTenantButton } from "@/components/dev/NewErpTenantButton";
import { TenantStatusToggle } from "@/components/dev/TenantStatusToggle";
import { AccessTenantButton } from "@/components/dev/AccessTenantButton";
import { DeleteTenantButton } from "@/components/dev/DeleteTenantButton";
import { LinkErpTenantButton } from "@/components/dev/LinkErpTenantButton";
import { GrantExtraEmpresaButton } from "@/components/dev/GrantExtraEmpresaButton";
import { EditFalaAiButton } from "@/components/dev/EditFalaAiButton";

export default async function DevTenantsPage() {
  const admin = createAdminClient();
  const { data: tenants } = await admin
    .from("tenants")
    .select("id, name, slug, status, seller_limit, manager_limit, billing_plan_id, erp_extra_empresas_granted, created_at")
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

  const { data: estoqueProducts } = await admin
    .from("tenant_products")
    .select("tenant_id")
    .eq("product", "estoque")
    .eq("status", "active");
  const estoqueTenantIds = new Set((estoqueProducts ?? []).map((p) => p.tenant_id));

  const { data: producaoProducts } = await admin
    .from("tenant_products")
    .select("tenant_id")
    .eq("product", "producao")
    .eq("status", "active");
  const producaoTenantIds = new Set((producaoProducts ?? []).map((p) => p.tenant_id));

  const { data: erpProducts } = await admin
    .from("tenant_products")
    .select("tenant_id")
    .eq("product", "erp")
    .eq("status", "active");
  const erpTenantIds = new Set((erpProducts ?? []).map((p) => p.tenant_id));

  const { data: empresaRows } = await admin.from("erp_empresas").select("tenant_id");
  const empresaCountByTenant = new Map<string, number>();
  for (const row of empresaRows ?? []) {
    empresaCountByTenant.set(row.tenant_id, (empresaCountByTenant.get(row.tenant_id) ?? 0) + 1);
  }

  // Vorlo de cada tenant — só editável por aqui (a tela de Agentes de IA do
  // próprio cliente não lista o Vorlo, ver listAgents em ai-agents.ts).
  const { data: falaAiRows } = await admin.from("ai_agents").select("*").eq("is_fala_ai", true);
  const falaAiByTenant = new Map((falaAiRows ?? []).map((a) => [a.tenant_id, a]));

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
          <NewEstoqueTenantButton />
          <NewProducaoTenantButton />
          <NewErpTenantButton />
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
            const hasEstoque = estoqueTenantIds.has(tenant.id);
            const hasProducao = producaoTenantIds.has(tenant.id);
            const hasErp = erpTenantIds.has(tenant.id);
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
                    {hasEstoque && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        Estoque
                      </span>
                    )}
                    {hasProducao && (
                      <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                        Produção
                      </span>
                    )}
                    {hasErp && (
                      <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">
                        ERP
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-gray-500">
                    /{tenant.slug}
                    {hasCrm && ` · até ${tenant.seller_limit} vendedores, ${tenant.manager_limit} gestores`}
                    {hasErp &&
                      ` · ${empresaCountByTenant.get(tenant.id) ?? 0}/${1 + tenant.erp_extra_empresas_granted} empresa(s) (${tenant.erp_extra_empresas_granted} extra concedida(s))`}
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
                  {hasCrm && !hasErp && (
                    <LinkErpTenantButton crmTenantId={tenant.id} crmTenantName={tenant.name} />
                  )}
                  {hasErp && <GrantExtraEmpresaButton tenantId={tenant.id} />}
                  <EditFalaAiButton tenantId={tenant.id} agent={falaAiByTenant.get(tenant.id) ?? null} />
                  {hasCrm && (
                    <>
                      <AccessTenantButton tenantId={tenant.id} />
                      <TenantStatusToggle tenantId={tenant.id} status={tenant.status} />
                    </>
                  )}
                  <DeleteTenantButton tenantId={tenant.id} tenantName={tenant.name} />
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
