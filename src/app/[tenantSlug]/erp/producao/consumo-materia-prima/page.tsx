"use client";

import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { getMockRawMaterialConsumption, type RawMaterialConsumption } from "@/mocks/erp/rawMaterialConsumption";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatShortDate } from "@/components/erp/lib/format";
import { cn } from "@/lib/utils/cn";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<RawMaterialConsumption>[] = [
  { key: "opNumber", header: "OP", sortable: true, sortAccessor: (r) => r.opNumber, render: (r) => <span className="font-medium text-gray-900">{r.opNumber}</span> },
  { key: "materialName", header: "Matéria-prima" },
  { key: "plannedQty", header: "Previsto", align: "right" },
  { key: "usedQty", header: "Utilizado", align: "right" },
  {
    key: "wastePct",
    header: "Perda",
    align: "right",
    sortable: true,
    sortAccessor: (r) => r.wastePct,
    render: (r) => (
      <span className={cn("font-medium", r.wastePct > 0 ? "text-red-600" : "text-emerald-600")}>
        {r.wastePct > 0 ? "+" : ""}
        {r.wastePct.toFixed(1)}%
      </span>
    ),
  },
  { key: "date", header: "Data", sortable: true, sortAccessor: (r) => r.date, render: (r) => formatShortDate(r.date) },
];

export default function ConsumoDeMateriaPrimaPage() {
  const tenantSlug = useTenantSlug();
  const consumption = getMockRawMaterialConsumption();

  return (
    <ListPageTemplate<RawMaterialConsumption>
      tenantSlug={tenantSlug}
      breadcrumb={[{ label: "Produção", href: "/erp/producao" }, { label: "Consumo de matéria-prima" }]}
      title="Consumo de matéria-prima"
      description="Comparativo entre matéria-prima prevista e efetivamente utilizada por OP."
      data={consumption}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["opNumber", "materialName"]}
      searchPlaceholder="Buscar por OP ou matéria-prima..."
    />
  );
}
