"use client";

import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { URGENCY_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockPurchaseSuggestions, type PurchaseSuggestion } from "@/mocks/erp/purchaseSuggestions";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<PurchaseSuggestion>[] = [
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
  { key: "currentStock", header: "Estoque atual", align: "right" },
  { key: "minStock", header: "Estoque mínimo", align: "right" },
  { key: "suggestedQty", header: "Qtd. sugerida", align: "right", render: (r) => <span className="font-medium text-gray-900">{r.suggestedQty.toLocaleString("pt-BR")}</span> },
  { key: "preferredSupplier", header: "Fornecedor preferencial" },
  { key: "urgency", header: "Urgência", render: (r) => <StatusBadge status={r.urgency} map={URGENCY_STATUS_MAP} /> },
];

export default function SugestaoDeComprasPage() {
  const tenantSlug = useTenantSlug();
  const suggestions = getMockPurchaseSuggestions();

  return (
    <ListPageTemplate<PurchaseSuggestion>
      tenantSlug={tenantSlug}
      breadcrumb={[{ label: "Compras" }, { label: "Sugestão de compras" }]}
      title="Sugestão de compras"
      description="Produtos abaixo do estoque mínimo com sugestão automática de reposição."
      data={suggestions}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["productName", "sku", "preferredSupplier"]}
      searchPlaceholder="Buscar por produto, SKU ou fornecedor..."
    />
  );
}
