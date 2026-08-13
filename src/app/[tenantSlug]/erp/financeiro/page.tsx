"use client";

import Link from "next/link";
import { Landmark, ArrowDownCircle, AlertTriangle, ArrowUpCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/erp/cards/StatCard";
import { BarChartErp } from "@/components/erp/charts/BarChartErp";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { FINANCE_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockFinanceInOutSeries } from "@/mocks/erp/dashboard";
import { getMockTotalBalance } from "@/mocks/erp/bankAccounts";
import { getMockReceivables } from "@/mocks/erp/receivables";
import { getMockPayables } from "@/mocks/erp/payables";
import { formatCurrency } from "@/lib/utils/currency";
import { formatShortDate } from "@/components/erp/lib/format";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";

function formatCompactCurrency(value: number): string {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
  return formatCurrency(value);
}

export default function FinanceiroPage() {
  const tenantSlug = useTenantSlug();
  const financeSeries = getMockFinanceInOutSeries();
  const receivables = getMockReceivables();
  const payables = getMockPayables();

  const balance = getMockTotalBalance();
  const receivableTotal = receivables.filter((r) => r.status !== "cancelado").reduce((s, r) => s + r.value, 0);
  const overdueTotal = receivables.filter((r) => r.status === "vencido").reduce((s, r) => s + r.value, 0);
  const payableTotal = payables.filter((p) => p.status !== "cancelado").reduce((s, p) => s + p.value, 0);

  const upcomingReceivables = [...receivables].filter((r) => r.status === "pendente").slice(0, 4);
  const upcomingPayables = [...payables].filter((p) => p.status === "pendente").slice(0, 4);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Financeiro</h1>
        <p className="mt-1 text-sm text-gray-500">Saldo, contas a pagar e a receber.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Saldo em caixa" value={formatCurrency(balance)} icon={Landmark} />
        <StatCard label="A receber" value={formatCurrency(receivableTotal)} icon={ArrowDownCircle} tone="success" />
        <StatCard label="Vencidas" value={formatCurrency(overdueTotal)} icon={AlertTriangle} tone="danger" />
        <StatCard label="A pagar" value={formatCurrency(payableTotal)} icon={ArrowUpCircle} tone="warning" />
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-gray-900">Entradas x saídas</h2>
        <p className="mt-0.5 text-xs text-gray-500">Últimos 6 meses</p>
        <div className="mt-4">
          <BarChartErp
            data={financeSeries}
            xKey="month"
            series={[
              { key: "entradas", label: "Entradas" },
              { key: "saidas", label: "Saídas" },
            ]}
            valueFormatter={formatCompactCurrency}
          />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-gray-900">Próximos recebimentos</h2>
            <Link href={`/${tenantSlug}/erp/financeiro/receber`} className="text-xs font-medium text-[#ff5722] hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingReceivables.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{r.customerName}</p>
                  <p className="text-xs text-gray-400">Vence em {formatShortDate(r.dueDate)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{formatCurrency(r.value)}</span>
                  <StatusBadge status={r.status} map={FINANCE_STATUS_MAP} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-gray-900">Próximos pagamentos</h2>
            <Link href={`/${tenantSlug}/erp/financeiro/pagar`} className="text-xs font-medium text-[#ff5722] hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingPayables.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{p.supplierName}</p>
                  <p className="text-xs text-gray-400">Vence em {formatShortDate(p.dueDate)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">{formatCurrency(p.value)}</span>
                  <StatusBadge status={p.status} map={FINANCE_STATUS_MAP} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
