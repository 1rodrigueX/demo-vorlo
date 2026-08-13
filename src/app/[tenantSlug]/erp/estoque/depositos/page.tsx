"use client";

import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { ACTIVE_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockWarehouses, type Warehouse } from "@/mocks/erp/warehouses";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<Warehouse>[] = [
  {
    key: "name",
    header: "Depósito",
    sortable: true,
    sortAccessor: (r) => r.name,
    render: (r) => (
      <div>
        <p className="font-medium text-gray-900">{r.name}</p>
        <p className="text-xs text-gray-400">{r.address}</p>
      </div>
    ),
  },
  { key: "city", header: "Cidade", render: (r) => `${r.city}/${r.state}` },
  { key: "itemsCount", header: "Itens em estoque", align: "right", render: (r) => r.itemsCount.toLocaleString("pt-BR") },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={ACTIVE_STATUS_MAP} /> },
];

export default function DepositosPage() {
  const tenantSlug = useTenantSlug();
  const warehouses = getMockWarehouses();

  return (
    <ListPageTemplate<Warehouse>
      tenantSlug={tenantSlug}
      breadcrumb={[{ label: "Estoque", href: "/erp/estoque" }, { label: "Depósitos" }]}
      title="Depósitos"
      description="Locais físicos onde o estoque é armazenado."
      primaryAction={{ label: "Novo depósito" }}
      data={warehouses}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["name", "city"]}
      searchPlaceholder="Buscar por nome ou cidade..."
    />
  );
}
