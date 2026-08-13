"use client";

import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { MOVEMENT_TYPE_MAP } from "@/components/erp/badges/statusMaps";
import { getMockCashTransactions, type CashTransaction } from "@/mocks/erp/cashTransactions";
import { getMockTotalBalance } from "@/mocks/erp/bankAccounts";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatCurrency } from "@/lib/utils/currency";
import { formatShortDate } from "@/components/erp/lib/format";
import { cn } from "@/lib/utils/cn";
import { Landmark, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<CashTransaction>[] = [
  { key: "date", header: "Data", sortable: true, sortAccessor: (r) => r.date, render: (r) => formatShortDate(r.date) },
  { key: "description", header: "Descrição" },
  { key: "category", header: "Categoria" },
  { key: "type", header: "Tipo", render: (r) => <StatusBadge status={r.type} map={MOVEMENT_TYPE_MAP} /> },
  {
    key: "value",
    header: "Valor",
    align: "right",
    sortable: true,
    sortAccessor: (r) => r.value,
    render: (r) => (
      <span className={cn("font-medium", r.type === "entrada" ? "text-emerald-600" : "text-red-600")}>
        {r.type === "entrada" ? "+" : "-"}
        {formatCurrency(r.value)}
      </span>
    ),
  },
];

export default function CaixaPage() {
  const tenantSlug = useTenantSlug();
  const transactions = getMockCashTransactions();
  const balance = getMockTotalBalance();
  const inflow = transactions.filter((t) => t.type === "entrada").reduce((s, t) => s + t.value, 0);
  const outflow = transactions.filter((t) => t.type === "saida").reduce((s, t) => s + t.value, 0);

  return (
    <ListPageTemplate<CashTransaction>
      tenantSlug={tenantSlug}
      breadcrumb={[{ label: "Financeiro", href: "/erp/financeiro" }, { label: "Caixa" }]}
      title="Caixa"
      description="Movimentações de entrada e saída de caixa."
      statCards={[
        { label: "Saldo atual", value: formatCurrency(balance), icon: Landmark },
        { label: "Entradas no período", value: formatCurrency(inflow), icon: ArrowDownCircle, tone: "success" },
        { label: "Saídas no período", value: formatCurrency(outflow), icon: ArrowUpCircle, tone: "warning" },
      ]}
      data={transactions}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["description", "category"]}
      searchPlaceholder="Buscar por descrição ou categoria..."
    />
  );
}
