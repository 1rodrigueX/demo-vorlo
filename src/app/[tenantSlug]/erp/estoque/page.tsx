"use client";

import { Package2, AlertTriangle, TrendingDown, Boxes, Lock } from "lucide-react";
import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { STOCK_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockStock, type StockItem } from "@/mocks/erp/stock";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<StockItem>[] = [
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
  { key: "quantity", header: "Estoque", align: "right", sortable: true, sortAccessor: (r) => r.quantity },
  { key: "reserved", header: "Reservado", align: "right" },
  { key: "available", header: "Disponível", align: "right", render: (r) => Math.max(r.quantity - r.reserved, 0) },
  { key: "minStock", header: "Mínimo", align: "right" },
  { key: "warehouse", header: "Depósito" },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={STOCK_STATUS_MAP} /> },
];

export default function EstoquePage() {
  const tenantSlug = useTenantSlug();
  const stock = getMockStock();

  const totalUnits = stock.reduce((sum, s) => sum + s.quantity, 0);
  const outOfStock = stock.filter((s) => s.status === "esgotado").length;
  const belowMin = stock.filter((s) => s.status === "baixo").length;
  const rawMaterials = stock.filter((s) => s.isRawMaterial).length;
  const reserved = stock.reduce((sum, s) => sum + s.reserved, 0);

  return (
    <ListPageTemplate<StockItem>
      tenantSlug={tenantSlug}
      title="Estoque"
      description="Posição de estoque por produto e depósito."
      statCards={[
        { label: "Estoque total", value: totalUnits.toLocaleString("pt-BR"), icon: Package2 },
        { label: "Produtos em falta", value: outOfStock, icon: AlertTriangle, tone: "danger" },
        { label: "Abaixo do mínimo", value: belowMin, icon: TrendingDown, tone: "warning" },
        { label: "Matéria-prima", value: rawMaterials, icon: Boxes },
        { label: "Reservados", value: reserved.toLocaleString("pt-BR"), icon: Lock },
      ]}
      data={stock}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["productName", "sku", "warehouse"]}
      searchPlaceholder="Buscar por produto, SKU ou depósito..."
    />
  );
}
