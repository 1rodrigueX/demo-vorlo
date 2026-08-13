"use client";

import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { RECEIPT_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockReceipts, type Receipt } from "@/mocks/erp/receipts";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatShortDate } from "@/components/erp/lib/format";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<Receipt>[] = [
  { key: "number", header: "Número", sortable: true, sortAccessor: (r) => r.number, render: (r) => <span className="font-medium text-gray-900">{r.number}</span> },
  { key: "purchaseOrderNumber", header: "Pedido de compra" },
  { key: "supplierName", header: "Fornecedor" },
  { key: "receivedDate", header: "Recebido em", sortable: true, sortAccessor: (r) => r.receivedDate, render: (r) => formatShortDate(r.receivedDate) },
  { key: "itemsCount", header: "Itens", align: "right" },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={RECEIPT_STATUS_MAP} /> },
];

export default function RecebimentosPage() {
  const tenantSlug = useTenantSlug();
  const receipts = getMockReceipts();

  return (
    <ListPageTemplate<Receipt>
      tenantSlug={tenantSlug}
      breadcrumb={[{ label: "Compras" }, { label: "Recebimentos" }]}
      title="Recebimentos"
      description="Conferência de mercadorias recebidas contra os pedidos de compra."
      data={receipts}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["number", "purchaseOrderNumber", "supplierName"]}
      searchPlaceholder="Buscar por número, pedido ou fornecedor..."
    />
  );
}
