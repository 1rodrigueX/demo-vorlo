import { DollarSign, ShoppingCart, FileText, Factory, ArrowDownCircle, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/erp/cards/StatCard";
import { LineAreaChart } from "@/components/erp/charts/LineAreaChart";
import { DonutChart } from "@/components/erp/charts/DonutChart";
import { formatCurrency } from "@/lib/utils/currency";
import { getErpDashboardData } from "@/lib/actions/erp-dashboard";

/** Formata valores grandes de forma compacta nos eixos dos gráficos (R$ 500K em vez de R$ 500.000). */
function formatCompactCurrency(value: number): string {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
  return formatCurrency(value);
}

/**
 * Faturamento/Vendas/Propostas abertas/gráfico de faturamento e Vendas por
 * status vêm de erp_propostas (real). Financeiro (A receber/Vencido/entradas
 * x saídas) e Produção (ordens por status) ainda não têm tabela própria no
 * ERP — em vez de mostrar números inventados aqui, ficam com "ainda sem esse
 * controle" até essas frentes virarem reais (ver /erp/financeiro e
 * /erp/producao, que continuam mock por enquanto).
 */
export default async function ErpDashboardPage() {
  const { kpis, revenueSeries, salesByStatus } = await getErpDashboardData();

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
        <StatCard label="Produção" value="—" icon={Factory} />
        <StatCard label="A receber" value="—" icon={ArrowDownCircle} tone="success" />
        <StatCard label="Vencido" value="—" icon={AlertTriangle} tone="danger" />
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
        <Card className="flex flex-col p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900">Financeiro — entradas x saídas</h2>
          <p className="mt-0.5 text-xs text-gray-500">Últimos 6 meses</p>
          <div className="flex flex-1 items-center justify-center py-10 text-center text-sm text-gray-500">
            Controle financeiro do ERP ainda não está disponível.
          </div>
        </Card>
        <Card className="flex flex-col p-5">
          <h2 className="text-sm font-semibold text-gray-900">Produção</h2>
          <p className="mt-0.5 text-xs text-gray-500">Ordens de produção por status</p>
          <div className="flex flex-1 items-center justify-center py-10 text-center text-sm text-gray-500">
            Ordens de produção ainda não estão disponíveis.
          </div>
        </Card>
      </div>
    </div>
  );
}
