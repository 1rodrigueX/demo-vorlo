"use client";

import Link from "next/link";
import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { ORDER_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockOrders, getOrderTotal, type SalesOrder } from "@/mocks/erp/orders";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatCurrency } from "@/lib/utils/currency";
import { formatShortDate } from "@/components/erp/lib/format";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

export default function PedidosDeVendaPage() {
  const tenantSlug = useTenantSlug();
  const orders = getMockOrders();

  const columns: DataTableColumn<SalesOrder>[] = [
    {
      key: "number",
      header: "Número",
      sortable: true,
      sortAccessor: (r) => r.number,
      render: (r) => (
        <Link href={`/${tenantSlug}/erp/vendas/pedidos/${r.id}`} className="font-medium text-[#ff5722] hover:underline">
          {r.number}
        </Link>
      ),
    },
    { key: "customerName", header: "Cliente" },
    { key: "sellerName", header: "Vendedor" },
    { key: "date", header: "Data", sortable: true, sortAccessor: (r) => r.date, render: (r) => formatShortDate(r.date) },
    {
      key: "total",
      header: "Valor",
      align: "right",
      sortable: true,
      sortAccessor: (r) => getOrderTotal(r),
      render: (r) => formatCurrency(getOrderTotal(r)),
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={ORDER_STATUS_MAP} /> },
  ];

  return (
    <ListPageTemplate<SalesOrder>
      tenantSlug={tenantSlug}
      breadcrumb={[{ label: "Vendas", href: "/erp/vendas" }, { label: "Pedidos de venda" }]}
      title="Pedidos de venda"
      description="Pedidos gerados a partir de vendas confirmadas."
      data={orders}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["number", "customerName", "sellerName"]}
      searchPlaceholder="Buscar por número, cliente ou vendedor..."
    />
  );
}
