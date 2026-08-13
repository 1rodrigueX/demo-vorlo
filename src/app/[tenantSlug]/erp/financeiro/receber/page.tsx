"use client";

import { ArrowDownCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { FINANCE_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockReceivables, type Receivable } from "@/mocks/erp/receivables";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatCurrency } from "@/lib/utils/currency";
import { formatShortDate } from "@/components/erp/lib/format";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<Receivable>[] = [
  { key: "customerName", header: "Cliente", sortable: true, sortAccessor: (r) => r.customerName },
  { key: "description", header: "Descrição" },
  { key: "dueDate", header: "Vencimento", sortable: true, sortAccessor: (r) => r.dueDate, render: (r) => formatShortDate(r.dueDate) },
  { key: "paymentMethod", header: "Forma de pagamento" },
  { key: "value", header: "Valor", align: "right", sortable: true, sortAccessor: (r) => r.value, render: (r) => formatCurrency(r.value) },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={FINANCE_STATUS_MAP} /> },
];

export default function ContasAReceberPage() {
  const tenantSlug = useTenantSlug();
  const receivables = getMockReceivables();

  const total = receivables.filter((r) => r.status !== "cancelado").reduce((s, r) => s + r.value, 0);
  const overdue = receivables.filter((r) => r.status === "vencido").reduce((s, r) => s + r.value, 0);
  const paid = receivables.filter((r) => r.status === "pago").reduce((s, r) => s + r.value, 0);

  return (
    <ListPageTemplate<Receivable>
      tenantSlug={tenantSlug}
      breadcrumb={[{ label: "Financeiro", href: "/erp/financeiro" }, { label: "Contas a receber" }]}
      title="Contas a receber"
      description="Recebimentos previstos, pagos e vencidos."
      primaryAction={{ label: "Nova conta a receber" }}
      statCards={[
        { label: "Total a receber", value: formatCurrency(total), icon: ArrowDownCircle },
        { label: "Vencido", value: formatCurrency(overdue), icon: AlertTriangle, tone: "danger" },
        { label: "Recebido", value: formatCurrency(paid), icon: CheckCircle2, tone: "success" },
      ]}
      data={receivables}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["customerName", "description"]}
      searchPlaceholder="Buscar por cliente ou descrição..."
    />
  );
}
