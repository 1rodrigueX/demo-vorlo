"use client";

import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { INVENTORY_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockStockInventoryCounts, type StockInventoryCount } from "@/mocks/erp/stockInventoryCounts";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatShortDate } from "@/components/erp/lib/format";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<StockInventoryCount>[] = [
  { key: "code", header: "Contagem", sortable: true, sortAccessor: (r) => r.code, render: (r) => <span className="font-medium text-gray-900">{r.code}</span> },
  { key: "warehouse", header: "Depósito" },
  { key: "date", header: "Data", sortable: true, sortAccessor: (r) => r.date, render: (r) => formatShortDate(r.date) },
  { key: "itemsCounted", header: "Itens contados", align: "right" },
  {
    key: "divergences",
    header: "Divergências",
    align: "right",
    render: (r) => <span className={r.divergences > 0 ? "font-medium text-amber-600" : "text-gray-500"}>{r.divergences}</span>,
  },
  { key: "responsible", header: "Responsável" },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={INVENTORY_STATUS_MAP} /> },
];

export default function InventarioPage() {
  const tenantSlug = useTenantSlug();
  const counts = getMockStockInventoryCounts();

  return (
    <ListPageTemplate<StockInventoryCount>
      tenantSlug={tenantSlug}
      breadcrumb={[{ label: "Estoque", href: "/erp/estoque" }, { label: "Inventário" }]}
      title="Inventário"
      description="Contagens de estoque, planejadas e realizadas."
      primaryAction={{ label: "Nova contagem" }}
      data={counts}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["code", "warehouse", "responsible"]}
      searchPlaceholder="Buscar por código, depósito ou responsável..."
    />
  );
}
