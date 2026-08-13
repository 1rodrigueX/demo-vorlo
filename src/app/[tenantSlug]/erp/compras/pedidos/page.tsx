"use client";

import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { PURCHASE_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockPurchaseOrders, type PurchaseOrder } from "@/mocks/erp/purchaseOrders";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatCurrency } from "@/lib/utils/currency";
import { formatShortDate } from "@/components/erp/lib/format";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<PurchaseOrder>[] = [
  { key: "number", header: "Número", sortable: true, sortAccessor: (r) => r.number, render: (r) => <span className="font-medium text-gray-900">{r.number}</span> },
  { key: "supplierName", header: "Fornecedor" },
  { key: "date", header: "Emissão", sortable: true, sortAccessor: (r) => r.date, render: (r) => formatShortDate(r.date) },
  { key: "expectedDate", header: "Previsão", render: (r) => formatShortDate(r.expectedDate) },
  { key: "itemsCount", header: "Itens", align: "right" },
  { key: "value", header: "Valor", align: "right", sortable: true, sortAccessor: (r) => r.value, render: (r) => formatCurrency(r.value) },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={PURCHASE_STATUS_MAP} /> },
];

export default function PedidosDeCompraPage() {
  const tenantSlug = useTenantSlug();
  const orders = getMockPurchaseOrders();

  return (
    <ListPageTemplate<PurchaseOrder>
      tenantSlug={tenantSlug}
      breadcrumb={[{ label: "Compras" }, { label: "Pedidos de compra" }]}
      title="Pedidos de compra"
      description="Pedidos emitidos para fornecedores de matéria-prima e insumos."
      primaryAction={{ label: "Novo pedido de compra" }}
      data={orders}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["number", "supplierName"]}
      searchPlaceholder="Buscar por número ou fornecedor..."
    />
  );
}
