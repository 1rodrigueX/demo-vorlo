"use client";

import Link from "next/link";
import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { ORDER_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockSales, type Sale } from "@/mocks/erp/sales";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatCurrency } from "@/lib/utils/currency";
import { formatShortDate } from "@/components/erp/lib/format";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: (tenantSlug: string) => DataTableColumn<Sale>[] = (tenantSlug) => [
  {
    key: "number",
    header: "Número",
    sortable: true,
    sortAccessor: (r) => r.number,
    render: (r) => (
      <Link href={`/${tenantSlug}/erp/vendas/${r.id}`} className="font-medium text-[#ff5722] hover:underline">
        {r.number}
      </Link>
    ),
  },
  { key: "customerName", header: "Cliente" },
  { key: "sellerName", header: "Vendedor" },
  { key: "date", header: "Data", sortable: true, sortAccessor: (r) => r.date, render: (r) => formatShortDate(r.date) },
  { key: "value", header: "Valor", align: "right", sortable: true, sortAccessor: (r) => r.value, render: (r) => formatCurrency(r.value) },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={ORDER_STATUS_MAP} /> },
];

export default function VendasPage() {
  const tenantSlug = useTenantSlug();
  const sales = getMockSales();

  return (
    <ListPageTemplate<Sale>
      tenantSlug={tenantSlug}
      breadcrumb={[{ label: "Vendas" }]}
      title="Vendas"
      description="Vendas confirmadas, faturadas ou em andamento."
      data={sales}
      columns={columns(tenantSlug)}
      getRowId={(r) => r.id}
      searchableFields={["number", "customerName", "sellerName"]}
      searchPlaceholder="Buscar por número, cliente ou vendedor..."
    />
  );
}
