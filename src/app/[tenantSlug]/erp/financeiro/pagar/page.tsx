"use client";

import { ArrowUpCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { FINANCE_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockPayables, type Payable } from "@/mocks/erp/payables";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatCurrency } from "@/lib/utils/currency";
import { formatShortDate } from "@/components/erp/lib/format";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<Payable>[] = [
  { key: "supplierName", header: "Fornecedor", sortable: true, sortAccessor: (r) => r.supplierName },
  { key: "description", header: "Descrição" },
  { key: "dueDate", header: "Vencimento", sortable: true, sortAccessor: (r) => r.dueDate, render: (r) => formatShortDate(r.dueDate) },
  { key: "paymentMethod", header: "Forma de pagamento" },
  { key: "value", header: "Valor", align: "right", sortable: true, sortAccessor: (r) => r.value, render: (r) => formatCurrency(r.value) },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={FINANCE_STATUS_MAP} /> },
];

export default function ContasAPagarPage() {
  const tenantSlug = useTenantSlug();
  const payables = getMockPayables();

  const total = payables.filter((p) => p.status !== "cancelado").reduce((s, p) => s + p.value, 0);
  const overdue = payables.filter((p) => p.status === "vencido").reduce((s, p) => s + p.value, 0);
  const paid = payables.filter((p) => p.status === "pago").reduce((s, p) => s + p.value, 0);

  return (
    <ListPageTemplate<Payable>
      tenantSlug={tenantSlug}
      breadcrumb={[{ label: "Financeiro", href: "/erp/financeiro" }, { label: "Contas a pagar" }]}
      title="Contas a pagar"
      description="Pagamentos previstos, pagos e vencidos."
      primaryAction={{ label: "Nova conta a pagar" }}
      statCards={[
        { label: "Total a pagar", value: formatCurrency(total), icon: ArrowUpCircle },
        { label: "Vencido", value: formatCurrency(overdue), icon: AlertTriangle, tone: "danger" },
        { label: "Pago", value: formatCurrency(paid), icon: CheckCircle2, tone: "success" },
      ]}
      data={payables}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["supplierName", "description"]}
      searchPlaceholder="Buscar por fornecedor ou descrição..."
    />
  );
}
