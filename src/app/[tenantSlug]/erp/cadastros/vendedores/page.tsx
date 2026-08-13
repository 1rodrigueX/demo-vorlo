"use client";

import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { ACTIVE_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockSellers, type Seller } from "@/mocks/erp/sellers";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatCurrency } from "@/lib/utils/currency";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<Seller>[] = [
  { key: "name", header: "Vendedor", sortable: true, sortAccessor: (r) => r.name, render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
  { key: "email", header: "E-mail" },
  { key: "commissionRate", header: "Comissão", align: "right", render: (r) => `${r.commissionRate}%` },
  { key: "salesTotal", header: "Total em vendas", align: "right", sortable: true, sortAccessor: (r) => r.salesTotal, render: (r) => formatCurrency(r.salesTotal) },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={ACTIVE_STATUS_MAP} /> },
];

export default function VendedoresPage() {
  const tenantSlug = useTenantSlug();
  const sellers = getMockSellers();

  return (
    <ListPageTemplate<Seller>
      tenantSlug={tenantSlug}
      title="Vendedores"
      description="Equipe de vendas e comissionamento."
      primaryAction={{ label: "Novo vendedor" }}
      data={sellers}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["name", "email"]}
      searchPlaceholder="Buscar por nome ou e-mail..."
    />
  );
}
