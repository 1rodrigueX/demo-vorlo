"use client";

import { DollarSign, ShoppingCart, FileText, Factory, ArrowDownCircle, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/erp/cards/StatCard";
import { LineAreaChart } from "@/components/erp/charts/LineAreaChart";
import { BarChartErp } from "@/components/erp/charts/BarChartErp";
import { DonutChart } from "@/components/erp/charts/DonutChart";
import { formatCurrency } from "@/lib/utils/currency";
import {
  getMockDashboardKpis,
  getMockRevenueSeries,
  getMockSalesByStatus,
  getMockFinanceInOutSeries,
  getMockProductionSummary,
} from "@/mocks/erp/dashboard";

/** Formata valores grandes de forma compacta nos eixos dos gráficos (R$ 500K em vez de R$ 500.000). */
function formatCompactCurrency(value: number): string {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
  return formatCurrency(value);
}

export default function ErpDashboardPage() {
  const kpis = getMockDashboardKpis();
  const revenueSeries = getMockRevenueSeries();
  const salesByStatus = getMockSalesByStatus();
  const financeSeries = getMockFinanceInOutSeries();
  const production = getMockProductionSummary();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Visão geral do seu negócio.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Faturamento" value={formatCurrency(kpis.revenue)} icon={DollarSign} />
        <StatCard label="Vendas" value={kpis.sales} icon={ShoppingCart} />
        <StatCard label="Propostas abertas" value={kpis.openQuotes} icon={FileText} tone="warning" />
        <StatCard label="Produção" value={`${kpis.productionOrders} OPs`} icon={Factory} />
        <StatCard label="A receber" value={formatCurrency(kpis.receivable)} icon={ArrowDownCircle} tone="success" />
        <StatCard label="Vencido" value={formatCurrency(kpis.overdue)} icon={AlertTriangle} tone="danger" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900">Faturamento</h2>
          <p className="mt-0.5 text-xs text-gray-500">Últimos 12 meses</p>
          <div className="mt-4">
            <LineAreaChart data={revenueSeries} xKey="month" valueKey="faturamento" variant="area" valueFormatter={formatCompactCurrency} />
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-gray-900">Vendas por status</h2>
          <p className="mt-0.5 text-xs text-gray-500">Propostas no período</p>
          <div className="mt-2">
            <DonutChart data={salesByStatus} centerLabel="propostas" />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900">Financeiro — entradas x saídas</h2>
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
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-gray-900">Produção</h2>
          <p className="mt-0.5 text-xs text-gray-500">Ordens de produção por status</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Planejadas</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{production.planned}</p>
            </div>
            <div className="rounded-lg bg-sky-50 p-3">
              <p className="text-xs text-sky-700">Em produção</p>
              <p className="mt-1 text-xl font-semibold text-sky-700">{production.inProgress}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-xs text-red-700">Atrasadas</p>
              <p className="mt-1 text-xl font-semibold text-red-700">{production.late}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">Concluídas</p>
              <p className="mt-1 text-xl font-semibold text-emerald-700">{production.completed}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
