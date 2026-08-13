"use client";

import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { PRODUCTION_STATUS_MAP, URGENCY_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockProductionSchedule, type ProductionScheduleItem } from "@/mocks/erp/productionSchedule";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatShortDate } from "@/components/erp/lib/format";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<ProductionScheduleItem>[] = [
  { key: "opNumber", header: "OP", sortable: true, sortAccessor: (r) => r.opNumber, render: (r) => <span className="font-medium text-gray-900">{r.opNumber}</span> },
  { key: "productName", header: "Produto" },
  { key: "machine", header: "Máquina" },
  { key: "plannedStart", header: "Início previsto", sortable: true, sortAccessor: (r) => r.plannedStart, render: (r) => formatShortDate(r.plannedStart) },
  { key: "plannedEnd", header: "Fim previsto", render: (r) => formatShortDate(r.plannedEnd) },
  { key: "priority", header: "Prioridade", render: (r) => <StatusBadge status={r.priority} map={URGENCY_STATUS_MAP} /> },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={PRODUCTION_STATUS_MAP} /> },
];

export default function ProgramacaoDeProducaoPage() {
  const tenantSlug = useTenantSlug();
  const schedule = getMockProductionSchedule();

  return (
    <ListPageTemplate<ProductionScheduleItem>
      tenantSlug={tenantSlug}
      breadcrumb={[{ label: "Produção", href: "/erp/producao" }, { label: "Programação" }]}
      title="Programação de produção"
      description="Planejamento de ordens de produção por máquina e período."
      data={schedule}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["opNumber", "productName", "machine"]}
      searchPlaceholder="Buscar por OP, produto ou máquina..."
    />
  );
}
