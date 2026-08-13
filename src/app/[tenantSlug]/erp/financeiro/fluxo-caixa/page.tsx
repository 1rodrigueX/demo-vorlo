"use client";

import { TrendingUp, ArrowDownCircle, ArrowUpCircle, Landmark } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/erp/cards/StatCard";
import { LineAreaChart } from "@/components/erp/charts/LineAreaChart";
import { ErpBreadcrumb } from "@/components/erp/layout/ErpBreadcrumb";
import { getMockFinanceInOutSeries } from "@/mocks/erp/dashboard";
import { getMockTotalBalance } from "@/mocks/erp/bankAccounts";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatCurrency } from "@/lib/utils/currency";

function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
  return formatCurrency(value);
}

export default function FluxoDeCaixaPage() {
  const tenantSlug = useTenantSlug();
  const series = getMockFinanceInOutSeries();
  const currentBalance = getMockTotalBalance();

  const totalNet = series.reduce((s, p) => s + (p.entradas - p.saidas), 0);
  const startingBalance = currentBalance - totalNet;
  const balanceSeries = series.reduce<{ month: string; saldo: number }[]>((acc, p) => {
    const previous = acc.length > 0 ? acc[acc.length - 1].saldo : startingBalance;
    acc.push({ month: p.month, saldo: Math.round(previous + (p.entradas - p.saidas)) });
    return acc;
  }, []);

  const lastMonth = series[series.length - 1];
  const netLastMonth = lastMonth.entradas - lastMonth.saidas;

  return (
    <div className="space-y-5">
      <ErpBreadcrumb items={[{ label: "Financeiro", href: "/erp/financeiro" }, { label: "Fluxo de caixa" }]} tenantSlug={tenantSlug} />
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Fluxo de caixa</h1>
        <p className="mt-1 text-sm text-gray-500">Evolução do saldo em caixa mês a mês.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Saldo atual" value={formatCurrency(currentBalance)} icon={Landmark} />
        <StatCard label="Entradas (último mês)" value={formatCurrency(lastMonth.entradas)} icon={ArrowDownCircle} tone="success" />
        <StatCard label="Saídas (último mês)" value={formatCurrency(lastMonth.saidas)} icon={ArrowUpCircle} tone="warning" />
        <StatCard
          label="Resultado (último mês)"
          value={formatCurrency(netLastMonth)}
          icon={TrendingUp}
          tone={netLastMonth >= 0 ? "success" : "danger"}
        />
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-gray-900">Saldo projetado</h2>
        <p className="mt-0.5 text-xs text-gray-500">Últimos 6 meses</p>
        <div className="mt-4">
          <LineAreaChart data={balanceSeries} xKey="month" valueKey="saldo" valueFormatter={formatCompactCurrency} />
        </div>
      </Card>
    </div>
  );
}
