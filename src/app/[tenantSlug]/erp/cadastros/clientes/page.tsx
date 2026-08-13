"use client";

import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { ACTIVE_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockCustomers, type Customer } from "@/mocks/erp/customers";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatCurrency } from "@/lib/utils/currency";
import { formatShortDate, formatDocument } from "@/components/erp/lib/format";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<Customer>[] = [
  {
    key: "name",
    header: "Cliente",
    sortable: true,
    sortAccessor: (r) => r.name,
    render: (r) => (
      <div>
        <p className="font-medium text-gray-900">{r.name}</p>
        <p className="text-xs text-gray-400">{formatDocument(r.document)}</p>
      </div>
    ),
  },
  { key: "segment", header: "Segmento" },
  { key: "city", header: "Cidade", render: (r) => `${r.city}/${r.state}` },
  { key: "email", header: "E-mail" },
  {
    key: "salesTotal",
    header: "Total em vendas",
    align: "right",
    sortable: true,
    sortAccessor: (r) => r.salesTotal,
    render: (r) => formatCurrency(r.salesTotal),
  },
  { key: "createdAt", header: "Cliente desde", render: (r) => formatShortDate(r.createdAt) },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={ACTIVE_STATUS_MAP} /> },
];

export default function ClientesPage() {
  const tenantSlug = useTenantSlug();
  const customers = getMockCustomers();

  return (
    <ListPageTemplate<Customer>
      tenantSlug={tenantSlug}
      title="Clientes"
      description="Cadastro de clientes da sua empresa."
      primaryAction={{ label: "Novo cliente" }}
      data={customers}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["name", "document", "email", "city"]}
      searchPlaceholder="Buscar por nome, documento, e-mail ou cidade..."
    />
  );
}
