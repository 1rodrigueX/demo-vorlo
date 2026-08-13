"use client";

import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { ACTIVE_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockEmployees, type Employee } from "@/mocks/erp/employees";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatShortDate } from "@/components/erp/lib/format";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<Employee>[] = [
  { key: "name", header: "Funcionário", sortable: true, sortAccessor: (r) => r.name, render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
  { key: "role", header: "Cargo" },
  { key: "department", header: "Departamento" },
  { key: "admissionDate", header: "Admissão", render: (r) => formatShortDate(r.admissionDate) },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={ACTIVE_STATUS_MAP} /> },
];

export default function FuncionariosPage() {
  const tenantSlug = useTenantSlug();
  const employees = getMockEmployees();

  return (
    <ListPageTemplate<Employee>
      tenantSlug={tenantSlug}
      title="Funcionários"
      description="Quadro de funcionários da empresa."
      primaryAction={{ label: "Novo funcionário" }}
      data={employees}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["name", "role", "department"]}
      searchPlaceholder="Buscar por nome, cargo ou departamento..."
    />
  );
}
