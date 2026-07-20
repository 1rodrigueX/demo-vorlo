"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import Link from "next/link";
import { Plus, Wallet, Building2, User, Settings, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/currency";
import { getLancamentos } from "@/lib/actions/financas";
import { getBankConnection } from "@/lib/actions/financas-bank";
import { CHART_COLORS, MONTH_LABELS, MONTH_LABELS_FULL } from "@/lib/financas/categories";
import { computeSavingsTip } from "@/lib/financas/insights";
import { Sparkline, DonutChart, MiniGauge, type DonutSlice } from "@/components/financas/charts";
import { NovoLancamentoModal } from "@/components/financas/NovoLancamentoModal";
import { BankConnectionPanel } from "@/components/financas/BankConnectionPanel";
import type { FinancasLancamento, FinancasCategoria, FinancasBankConnection } from "@/types/domain";

const compactCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const YEARS = [2024, 2025, 2026];

function tooltipStyle() {
  return {
    contentStyle: { background: "#1a1a19", border: "1px solid #383835", borderRadius: 8, fontSize: 12 },
    labelStyle: { color: "#ffffff" },
  };
}

export function FinanceiroDashboard({
  initialLancamentos,
  initialYear,
  categorias,
  tenantSlug,
  initialBankConnection,
}: {
  initialLancamentos: FinancasLancamento[];
  initialYear: number;
  categorias: FinancasCategoria[];
  tenantSlug: string;
  initialBankConnection: FinancasBankConnection | null;
}) {
  const despesaCategorias = useMemo(() => categorias.filter((c) => c.type === "despesa"), [categorias]);
  const receitaCategorias = useMemo(() => categorias.filter((c) => c.type === "receita"), [categorias]);

  const now = new Date();
  const [context, setContext] = useState<"pessoal" | "empresarial">("pessoal");
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    despesaCategorias[4]?.name ?? despesaCategorias[0]?.name ?? "",
  );
  const [lancamentos, setLancamentos] = useState(initialLancamentos);
  const [bankConnection, setBankConnection] = useState(initialBankConnection);
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    startTransition(async () => {
      const data = await getLancamentos(context, year);
      setLancamentos(data);
    });
  }, [context, year]);

  function refreshAfterBankChange() {
    startTransition(async () => {
      const [data, conn] = await Promise.all([getLancamentos(context, year), getBankConnection()]);
      setLancamentos(data);
      setBankConnection(conn);
    });
  }

  const monthly = useMemo(() => {
    const rows = Array.from({ length: 12 }, () => ({ receita: 0, despesa: 0, salario: 0, outrasReceitas: 0 }));
    for (const l of lancamentos) {
      const m = new Date(l.entry_date + "T00:00:00").getMonth();
      const value = l.amount_cents / 100;
      if (l.type === "receita") {
        rows[m].receita += value;
        if (l.category === "Salário") rows[m].salario += value;
        else rows[m].outrasReceitas += value;
      } else {
        rows[m].despesa += value;
      }
    }
    return rows;
  }, [lancamentos]);

  const currentMonthLancamentos = useMemo(
    () => lancamentos.filter((l) => new Date(l.entry_date + "T00:00:00").getMonth() + 1 === month),
    [lancamentos, month],
  );

  const saldoMes = monthly[month - 1].receita - monthly[month - 1].despesa;
  const despesasMes = monthly[month - 1].despesa;

  const saldoSparkline = useMemo(() => buildDailySparkline(currentMonthLancamentos, year, month, "saldo"), [
    currentMonthLancamentos,
    year,
    month,
  ]);
  const despesasSparkline = useMemo(
    () => buildDailySparkline(currentMonthLancamentos, year, month, "despesa"),
    [currentMonthLancamentos, year, month],
  );

  const despesasMesPorCategoria: DonutSlice[] = useMemo(
    () => buildCategorySlices(currentMonthLancamentos, despesaCategorias),
    [currentMonthLancamentos, despesaCategorias],
  );

  const despesasAnoLancamentos = useMemo(() => lancamentos.filter((l) => l.type === "despesa"), [lancamentos]);
  const despesasAnoPorCategoria: DonutSlice[] = useMemo(
    () => buildCategorySlices(despesasAnoLancamentos, despesaCategorias),
    [despesasAnoLancamentos, despesaCategorias],
  );
  const despesasAnoTotal = despesasAnoPorCategoria.reduce((s, d) => s + d.value, 0);
  const despesasMesTotalForDonut = despesasMesPorCategoria.reduce((s, d) => s + d.value, 0);

  const categoryDetail = useMemo(() => {
    const byDescription = new Map<string, number>();
    for (const l of currentMonthLancamentos) {
      if (l.type !== "despesa" || l.category !== selectedCategory) continue;
      const key = l.description?.trim() || l.category;
      byDescription.set(key, (byDescription.get(key) ?? 0) + l.amount_cents / 100);
    }
    return [...byDescription.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [currentMonthLancamentos, selectedCategory]);
  const categoryDetailMax = Math.max(1, ...categoryDetail.map((d) => d.value));

  const cardSpendMes = useMemo(
    () =>
      currentMonthLancamentos
        .filter((l) => l.type === "despesa" && l.payment_method === "cartao_credito")
        .reduce((sum, l) => sum + l.amount_cents / 100, 0),
    [currentMonthLancamentos],
  );

  const savingsTip = useMemo(() => computeSavingsTip(lancamentos, year, month), [lancamentos, year, month]);

  const barData = MONTH_LABELS.map((label, i) => ({
    label,
    Salário: Math.round(monthly[i].salario),
    "Outras Receitas": Math.round(monthly[i].outrasReceitas),
  }));

  const lineData = MONTH_LABELS.map((label, i) => ({
    label,
    Receita: Math.round(monthly[i].receita),
    Despesa: Math.round(monthly[i].despesa),
  }));

  return (
    <div className="min-h-screen" style={{ background: "#0d0d0d", color: "#ffffff" }}>
      <div className="mx-auto flex max-w-7xl gap-6 p-6">
        <aside className="w-40 shrink-0 space-y-6">
          <div className="flex items-center gap-2">
            <Wallet size={20} className="text-[#3987e5]" />
            <div className="text-sm font-semibold leading-tight">
              Dashboard
              <br />
              Finanças {context === "pessoal" ? "Pessoais" : "Empresariais"}
            </div>
          </div>

          <div className="space-y-1">
            {YEARS.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                  y === year ? "bg-[#3987e5] font-medium text-white" : "text-[#898781] hover:text-white"
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          <div className="space-y-0.5">
            {MONTH_LABELS_FULL.map((label, i) => (
              <button
                key={label}
                onClick={() => setMonth(i + 1)}
                className={`block w-full rounded-md px-3 py-1 text-left text-xs transition-colors ${
                  i + 1 === month ? "bg-[#3987e5] font-medium text-white" : "text-[#898781] hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex rounded-lg border border-[#383835] p-1">
              <button
                onClick={() => setContext("pessoal")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  context === "pessoal" ? "bg-[#3987e5] text-white" : "text-[#898781] hover:text-white"
                }`}
              >
                <User size={14} />
                Pessoal
              </button>
              <button
                onClick={() => setContext("empresarial")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  context === "empresarial" ? "bg-[#3987e5] text-white" : "text-[#898781] hover:text-white"
                }`}
              >
                <Building2 size={14} />
                Empresarial
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/${tenantSlug}/financeiro/configuracoes`}
                className="flex items-center gap-1.5 rounded-lg border border-[#383835] px-3 py-2 text-sm text-[#898781] transition-colors hover:text-white"
              >
                <Settings size={14} />
                Configurações
              </Link>
              <Button onClick={() => setModalOpen(true)} isLoading={isPending && false}>
                <Plus size={16} />
                Novo Lançamento
              </Button>
            </div>
          </div>

          {context === "pessoal" && (
            <div className="space-y-4">
              <BankConnectionPanel
                connection={bankConnection}
                cardSpendMes={cardSpendMes}
                onChanged={refreshAfterBankChange}
              />
              {savingsTip && (
                <div className="flex items-start gap-3 rounded-xl border border-[#3987e5]/30 bg-[#3987e5]/10 p-4">
                  <Lightbulb size={16} className="mt-0.5 shrink-0 text-[#3987e5]" />
                  <p className="text-sm text-[#c3c2b7]">
                    <span className="font-medium text-white">Dica de economia: </span>
                    {savingsTip.message}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Saldo do mês"
              value={formatCurrency(saldoMes)}
              color={CHART_COLORS.blue}
              sparkline={saldoSparkline}
            />
            <StatCard
              label="Despesas do mês"
              value={formatCurrency(despesasMes)}
              color={CHART_COLORS.magenta}
              sparkline={despesasSparkline}
            />
            <Panel title="Despesas no Mês">
              <DonutChart
                data={despesasMesPorCategoria}
                centerLabel={despesasAnoTotal > 0 ? `${((despesasMesTotalForDonut / despesasAnoTotal) * 100).toFixed(1)}%` : "0%"}
              />
            </Panel>
            <Panel title="Despesas no Ano">
              <DonutChart data={despesasAnoPorCategoria} centerLabel={formatCurrency(despesasAnoTotal).replace(",00", "")} />
            </Panel>
          </div>

          <Panel title="Participação na base anual">
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
              {despesaCategorias.map((cat) => {
                const catTotal = despesasAnoPorCategoria.find((d) => d.name === cat.name)?.value ?? 0;
                const pct = despesasAnoTotal > 0 ? (catTotal / despesasAnoTotal) * 100 : 0;
                return <MiniGauge key={cat.id} label={cat.name} percent={pct} color={cat.color} />;
              })}
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Análise Mensal">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#2c2c2a" vertical={false} />
                    <XAxis dataKey="label" stroke="#898781" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#898781"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tickFormatter={(v: number) => compactCurrency.format(v)}
                    />
                    <Tooltip
                      {...tooltipStyle()}
                      formatter={(value) => formatCurrency(Number(value))}
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#c3c2b7" }} />
                    <Bar dataKey="Salário" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar
                      dataKey="Outras Receitas"
                      fill={CHART_COLORS.magenta}
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Detalhamento de Despesas">
              <div className="flex gap-4">
                <div className="min-w-0 flex-1 space-y-3">
                  {categoryDetail.length === 0 && (
                    <p className="py-8 text-center text-sm text-[#898781]">Sem despesas nessa categoria.</p>
                  )}
                  {categoryDetail.map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 truncate text-xs text-[#c3c2b7]">{item.label}</span>
                      <div className="h-2 flex-1 rounded-full bg-[#2c2c2a]">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${(item.value / categoryDetailMax) * 100}%`,
                            backgroundColor: colorForCategory(despesaCategorias, selectedCategory),
                          }}
                        />
                      </div>
                      <span className="w-20 shrink-0 text-right text-xs text-white">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
                <ul className="w-28 shrink-0 space-y-1 border-l border-[#2c2c2a] pl-3">
                  {despesaCategorias.map((cat) => (
                    <li key={cat.id}>
                      <button
                        onClick={() => setSelectedCategory(cat.name)}
                        className={`w-full rounded px-2 py-1 text-left text-xs transition-colors ${
                          selectedCategory === cat.name ? "bg-[#3987e5] text-white" : "text-[#898781] hover:text-white"
                        }`}
                      >
                        {cat.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          </div>

          <Panel title="Receitas e Despesas">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#2c2c2a" vertical={false} />
                  <XAxis dataKey="label" stroke="#898781" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#898781"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(v: number) => compactCurrency.format(v)}
                  />
                  <Tooltip {...tooltipStyle()} formatter={(value) => formatCurrency(Number(value))} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#c3c2b7" }} />
                  <Line
                    type="monotone"
                    dataKey="Receita"
                    stroke={CHART_COLORS.blue}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Despesa"
                    stroke={CHART_COLORS.magenta}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>

      <NovoLancamentoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        context={context}
        despesaCategorias={despesaCategorias}
        receitaCategorias={receitaCategorias}
        onSaved={() => {
          setModalOpen(false);
          startTransition(async () => {
            const data = await getLancamentos(context, year);
            setLancamentos(data);
          });
        }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  sparkline,
}: {
  label: string;
  value: string;
  color: string;
  sparkline: { value: number }[];
}) {
  return (
    <div className="rounded-xl border border-[#2c2c2a] bg-[#1a1a19] p-4">
      <p className="text-xs text-[#898781]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
      <div className="mt-2">
        <Sparkline data={sparkline} color={color} />
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#2c2c2a] bg-[#1a1a19] p-4">
      <p className="mb-3 text-sm font-medium text-[#c3c2b7]">{title}</p>
      {children}
    </div>
  );
}

function buildCategorySlices(rows: FinancasLancamento[], despesaCategorias: FinancasCategoria[]): DonutSlice[] {
  const byCategory = new Map<string, number>();
  for (const l of rows) {
    if (l.type !== "despesa") continue;
    byCategory.set(l.category, (byCategory.get(l.category) ?? 0) + l.amount_cents / 100);
  }
  return despesaCategorias
    .filter((c) => byCategory.has(c.name))
    .map((c) => ({ name: c.name, value: byCategory.get(c.name) ?? 0, color: c.color }));
}

function colorForCategory(categorias: FinancasCategoria[], name: string): string {
  return categorias.find((c) => c.name === name)?.color ?? CHART_COLORS.violet;
}

function buildDailySparkline(
  rows: FinancasLancamento[],
  year: number,
  month: number,
  mode: "saldo" | "despesa",
): { value: number }[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const byDay = new Array(daysInMonth + 1).fill(0);
  for (const l of rows) {
    const day = new Date(l.entry_date + "T00:00:00").getDate();
    const value = l.amount_cents / 100;
    if (mode === "saldo") byDay[day] += l.type === "receita" ? value : -value;
    else if (l.type === "despesa") byDay[day] += value;
  }
  let running = 0;
  const points: { value: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    running += byDay[d];
    points.push({ value: running });
  }
  return points.length ? points : [{ value: 0 }, { value: 0 }];
}
