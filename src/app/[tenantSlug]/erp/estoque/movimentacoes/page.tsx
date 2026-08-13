"use client";

import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { MOVEMENT_TYPE_MAP } from "@/components/erp/badges/statusMaps";
import { getMockStockMovements, type StockMovement } from "@/mocks/erp/stockMovements";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatShortDate } from "@/components/erp/lib/format";
import { cn } from "@/lib/utils/cn";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<StockMovement>[] = [
  { key: "date", header: "Data", sortable: true, sortAccessor: (r) => r.date, render: (r) => formatShortDate(r.date) },
  {
    key: "productName",
    header: "Produto",
    sortable: true,
    sortAccessor: (r) => r.productName,
    render: (r) => (
      <div>
        <p className="font-medium text-gray-900">{r.productName}</p>
        <p className="text-xs text-gray-400">{r.sku}</p>
      </div>
    ),
  },
  { key: "type", header: "Tipo", render: (r) => <StatusBadge status={r.type} map={MOVEMENT_TYPE_MAP} /> },
  {
    key: "quantity",
    header: "Quantidade",
    align: "right",
    render: (r) => (
      <span className={cn("font-medium", r.quantity < 0 ? "text-red-600" : "text-gray-900")}>
        {r.quantity > 0 ? "+" : ""}
        {r.quantity.toLocaleString("pt-BR")}
      </span>
    ),
  },
  { key: "reason", header: "Motivo" },
  { key: "warehouse", header: "Depósito" },
  { key: "responsible", header: "Responsável" },
];

export default function MovimentacoesPage() {
  const tenantSlug = useTenantSlug();
  const movements = getMockStockMovements();

  return (
    <ListPageTemplate<StockMovement>
      tenantSlug={tenantSlug}
      breadcrumb={[{ label: "Estoque", href: "/erp/estoque" }, { label: "Movimentações" }]}
      title="Movimentações de estoque"
      description="Entradas, saídas e ajustes registrados no estoque."
      data={movements}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["productName", "sku", "reason", "warehouse", "responsible"]}
      searchPlaceholder="Buscar por produto, motivo ou depósito..."
    />
  );
}
