"use client";

import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { ACTIVE_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockProducts, type Product } from "@/mocks/erp/products";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatCurrency } from "@/lib/utils/currency";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<Product>[] = [
  {
    key: "name",
    header: "Produto",
    sortable: true,
    sortAccessor: (r) => r.name,
    render: (r) => (
      <div>
        <p className="font-medium text-gray-900">{r.name}</p>
        <p className="text-xs text-gray-400">{r.sku}</p>
      </div>
    ),
  },
  { key: "category", header: "Categoria" },
  { key: "unit", header: "Unid.", align: "center" },
  { key: "salePrice", header: "Preço de venda", align: "right", sortable: true, sortAccessor: (r) => r.salePrice, render: (r) => formatCurrency(r.salePrice) },
  {
    key: "stock",
    header: "Estoque",
    align: "right",
    sortable: true,
    sortAccessor: (r) => r.stock,
    render: (r) => (
      <span className={r.stock === 0 ? "font-semibold text-red-600" : r.stock < r.minStock ? "font-semibold text-amber-600" : "text-gray-700"}>
        {r.stock}
      </span>
    ),
  },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={ACTIVE_STATUS_MAP} /> },
];

export default function ProdutosPage() {
  const tenantSlug = useTenantSlug();
  const products = getMockProducts();

  return (
    <ListPageTemplate<Product>
      tenantSlug={tenantSlug}
      title="Produtos"
      description="Cadastro de produtos, preços e controle de estoque mínimo."
      primaryAction={{ label: "Novo produto" }}
      data={products}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["name", "sku", "category"]}
      searchPlaceholder="Buscar por nome, SKU ou categoria..."
    />
  );
}
