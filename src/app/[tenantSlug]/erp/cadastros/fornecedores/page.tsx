"use client";

import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { ACTIVE_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockSuppliers, type Supplier } from "@/mocks/erp/suppliers";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatDocument } from "@/components/erp/lib/format";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<Supplier>[] = [
  {
    key: "name",
    header: "Fornecedor",
    sortable: true,
    sortAccessor: (r) => r.name,
    render: (r) => (
      <div>
        <p className="font-medium text-gray-900">{r.name}</p>
        <p className="text-xs text-gray-400">{formatDocument(r.document)}</p>
      </div>
    ),
  },
  { key: "category", header: "Categoria" },
  { key: "city", header: "Cidade", render: (r) => `${r.city}/${r.state}` },
  { key: "email", header: "E-mail" },
  { key: "phone", header: "Telefone" },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={ACTIVE_STATUS_MAP} /> },
];

export default function FornecedoresPage() {
  const tenantSlug = useTenantSlug();
  const suppliers = getMockSuppliers();

  return (
    <ListPageTemplate<Supplier>
      tenantSlug={tenantSlug}
      title="Fornecedores"
      description="Cadastro de fornecedores de matéria-prima, insumos e serviços."
      primaryAction={{ label: "Novo fornecedor" }}
      data={suppliers}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["name", "document", "email", "city", "category"]}
      searchPlaceholder="Buscar por nome, documento, e-mail ou categoria..."
    />
  );
}
