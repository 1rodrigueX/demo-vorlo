"use client";

import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { ACTIVE_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockCategories, type Category } from "@/mocks/erp/categories";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<Category>[] = [
  { key: "name", header: "Categoria", sortable: true, sortAccessor: (r) => r.name, render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
  { key: "parentName", header: "Categoria pai", render: (r) => r.parentName ?? <span className="text-gray-400">—</span> },
  { key: "productsCount", header: "Produtos", align: "right", sortable: true, sortAccessor: (r) => r.productsCount },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={ACTIVE_STATUS_MAP} /> },
];

export default function CategoriasPage() {
  const tenantSlug = useTenantSlug();
  const categories = getMockCategories();

  return (
    <ListPageTemplate<Category>
      tenantSlug={tenantSlug}
      title="Categorias"
      description="Organização das categorias de produtos."
      primaryAction={{ label: "Nova categoria" }}
      data={categories}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["name"]}
      searchPlaceholder="Buscar categoria..."
    />
  );
}
