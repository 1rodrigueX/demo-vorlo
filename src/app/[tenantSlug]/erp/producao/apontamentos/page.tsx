"use client";

import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { getMockProductionAppointments, type ProductionAppointment } from "@/mocks/erp/productionAppointments";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatShortDate } from "@/components/erp/lib/format";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<ProductionAppointment>[] = [
  { key: "opNumber", header: "OP", sortable: true, sortAccessor: (r) => r.opNumber, render: (r) => <span className="font-medium text-gray-900">{r.opNumber}</span> },
  { key: "date", header: "Data", sortable: true, sortAccessor: (r) => r.date, render: (r) => formatShortDate(r.date) },
  { key: "shift", header: "Turno" },
  { key: "operator", header: "Operador" },
  { key: "machine", header: "Máquina" },
  { key: "quantityProduced", header: "Produzido", align: "right", render: (r) => r.quantityProduced.toLocaleString("pt-BR") },
  {
    key: "quantityRejected",
    header: "Rejeitado",
    align: "right",
    render: (r) => <span className={r.quantityRejected > 0 ? "font-medium text-red-600" : "text-gray-500"}>{r.quantityRejected}</span>,
  },
];

export default function ApontamentosDeProducaoPage() {
  const tenantSlug = useTenantSlug();
  const appointments = getMockProductionAppointments();

  return (
    <ListPageTemplate<ProductionAppointment>
      tenantSlug={tenantSlug}
      breadcrumb={[{ label: "Produção", href: "/erp/producao" }, { label: "Apontamentos" }]}
      title="Apontamentos de produção"
      description="Registros de produção por turno, operador e máquina."
      primaryAction={{ label: "Novo apontamento" }}
      data={appointments}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["opNumber", "operator", "machine"]}
      searchPlaceholder="Buscar por OP, operador ou máquina..."
    />
  );
}
