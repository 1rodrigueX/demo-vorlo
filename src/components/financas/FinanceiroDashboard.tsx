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
import {
  Plus,
  Wallet,
  Building2,
  User,
  Settings,
  Lightbulb,
  TrendingUp,
  Home,
  Utensils,
  Truck,
  HeartPulse,
  Umbrella,
  Shirt,
  Package,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils/currency";
import { getLancamentos } from "@/lib/actions/financas";
import { getBankConnection } from "@/lib/actions/financas-bank";
import { getInboxItems } from "@/lib/actions/financas-inbox";
import { CHART_COLORS, MONTH_LABELS, MONTH_LABELS_FULL } from "@/lib/financas/categories";
import { computeSavingsTip } from "@/lib/financas/insights";
import { Sparkline, DonutChart, MiniBars, type DonutSlice } from "@/components/financas/charts";
import { NovoLancamentoModal } from "@/components/financas/NovoLancamentoModal";
import { BankConnectionPanel } from "@/components/financas/BankConnectionPanel";
import { InboxPanel } from "@/components/financas/InboxPanel";
import type {
  FinancasLancamento,
  FinancasCategoria,
  FinancasBankConnection,
  FinancasInboxItem,
} from "@/types/domain";

const YEARS = [2024, 2025, 2026];

/** Neon do dashboard escuro. cyan = saldo/receita, pink = despesa. */
const NEON = {
  cyan: "#22d3ee",
  pink: "#f24fa0",
  violet: "#a855f7",
} as const;

/** Ícone por nome de categoria de despesa (fallback: Tag). */
const CATEGORY_ICONS: Record<string, typeof Home> = {
  Moradia: Home,
  Subsistência: Utensils,
  Alimentação: Utensils,
  Transporte: Truck,
  Saúde: HeartPulse,
  Lazer: Umbrella,
  Vestuário: Shirt,
  Estoque: Package,
};

function tooltipStyle() {
  return {
    contentStyle: {
      background: "rgba(9,11,18,0.95)",
      border: "1px solid rgba(34,211,238,0.35)",
      borderRadius: 10,
      fontSize: 12,
      boxShadow: "0 8px 30px -10px rgba(34,211,238,0.4)",
    },
    labelStyle: { color: "#e8eaf2" },
    itemStyle: { color: "#e8eaf2" },
  };
}

export function FinanceiroDashboard({
  initialLancamentos,
  initialYear,
  categorias,
  tenantSlug,
  initialBankConnection,
  initialInboxItems,
}: {
  initialLancamentos: FinancasLancamento[];
  initialYear: number;
  categorias: FinancasCategoria[];
  tenantSlug: string;
  initialBankConnection: FinancasBankConnection | null;
  initialInboxItems: FinancasInboxItem[];
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
  const [inboxItems, setInboxItems] = useState(initialInboxItems);
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

  function refreshAfterInboxChange() {
    startTransition(async () => {
      const [data, inbox] = await Promise.all([getLancamentos(context, year), getInboxItems()]);
      setLancamentos(data);
      setInboxItems(inbox);
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

  // Gasto mensal (12 meses) por categoria de despesa — alimenta as mini barras
  // dos tiles de "Participação na base anual".
  const categoryMonthly = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const c of despesaCategorias) map[c.name] = new Array(12).fill(0);
    for (const l of lancamentos) {
      if (l.type !== "despesa" || !map[l.category]) continue;
      const m = new Date(l.entry_date + "T00:00:00").getMonth();
      map[l.category][m] += l.amount_cents / 100;
    }
    return map;
  }, [lancamentos, despesaCategorias]);

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
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#05060c", color: "#e8eaf2" }}>
      {/* Halos neon de fundo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(34,211,238,0.14), transparent 60%)", filter: "blur(40px)" }}
        />
        <div
          className="absolute -right-40 top-16 h-[520px] w-[520px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(242,79,160,0.12), transparent 60%)", filter: "blur(40px)" }}
        />
        <div
          className="absolute bottom-0 left-1/3 h-[420px] w-[640px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.10), transparent 60%)", filter: "blur(40px)" }}
        />
      </div>

      <div className="relative z-10 mx-auto flex max-w-7xl gap-6 p-6">
        <aside className="w-40 shrink-0 space-y-6 rounded-2xl border border-white/5 bg-white/[0.02] p-3 backdrop-blur">
          <div className="flex items-center gap-2 px-1">
            <Wallet size={20} style={{ color: NEON.cyan }} />
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
                className={cn(
                  "block w-full rounded-lg px-3 py-1.5 text-left text-sm transition-all",
                  y === year ? "font-semibold text-white" : "text-[#8b93a7] hover:text-white",
                )}
                style={
                  y === year
                    ? {
                        background: `linear-gradient(135deg, ${NEON.cyan}33, ${NEON.violet}22)`,
                        boxShadow: `inset 0 0 0 1px ${NEON.cyan}66, 0 0 18px -8px ${NEON.cyan}`,
                      }
                    : undefined
                }
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
                className={cn(
                  "block w-full rounded-lg px-3 py-1 text-left text-xs transition-all",
                  i + 1 === month ? "font-semibold text-white" : "text-[#8b93a7] hover:text-white",
                )}
                style={
                  i + 1 === month
                    ? {
                        background: `linear-gradient(135deg, ${NEON.cyan}33, ${NEON.violet}22)`,
                        boxShadow: `inset 0 0 0 1px ${NEON.cyan}66, 0 0 18px -8px ${NEON.cyan}`,
                      }
                    : undefined
                }
              >
                {label}
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur">
              <button
                onClick={() => setContext("pessoal")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all",
                  context === "pessoal" ? "text-white" : "text-[#8b93a7] hover:text-white",
                )}
                style={
                  context === "pessoal"
                    ? { background: `linear-gradient(135deg, ${NEON.cyan}, ${NEON.violet})`, boxShadow: `0 0 20px -6px ${NEON.cyan}` }
                    : undefined
                }
              >
                <User size={14} />
                Pessoal
              </button>
              <button
                onClick={() => setContext("empresarial")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all",
                  context === "empresarial" ? "text-white" : "text-[#8b93a7] hover:text-white",
                )}
                style={
                  context === "empresarial"
                    ? { background: `linear-gradient(135deg, ${NEON.cyan}, ${NEON.violet})`, boxShadow: `0 0 20px -6px ${NEON.cyan}` }
                    : undefined
                }
              >
                <Building2 size={14} />
                Empresarial
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/${tenantSlug}/financeiro/investimentos`}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-[#8b93a7] transition-colors hover:border-white/20 hover:text-white"
              >
                <TrendingUp size={14} />
                Investimentos
              </Link>
              <Link
                href={`/${tenantSlug}/financeiro/configuracoes`}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-[#8b93a7] transition-colors hover:border-white/20 hover:text-white"
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
                <div
                  className="flex items-start gap-3 rounded-2xl border p-4"
                  style={{
                    borderColor: `${NEON.violet}55`,
                    background: `linear-gradient(135deg, ${NEON.violet}1a, transparent)`,
                    boxShadow: `0 0 30px -18px ${NEON.violet}`,
                  }}
                >
                  <Lightbulb size={16} className="mt-0.5 shrink-0" style={{ color: NEON.violet }} />
                  <p className="text-sm text-[#c3c7d4]">
                    <span className="font-medium text-white">Dica de economia: </span>
                    {savingsTip.message}
                  </p>
                </div>
              )}
            </div>
          )}

          {context === "empresarial" && (
            <InboxPanel items={inboxItems} onChanged={refreshAfterInboxChange} />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Saldo do mês" value={formatCurrency(saldoMes)} accent={NEON.cyan} sparkline={saldoSparkline} />
            <StatCard
              label="Despesas do mês"
              value={formatCurrency(despesasMes)}
              accent={NEON.pink}
              sparkline={despesasSparkline}
            />
            <Panel title="Despesas no Mês" accent={NEON.violet}>
              <DonutChart
                data={despesasMesPorCategoria}
                centerLabel={
                  despesasAnoTotal > 0 ? `${((despesasMesTotalForDonut / despesasAnoTotal) * 100).toFixed(1)}%` : "0%"
                }
              />
            </Panel>
            <Panel title="Despesas no Ano" accent={NEON.cyan}>
              <DonutChart data={despesasAnoPorCategoria} centerLabel={formatCurrency(despesasAnoTotal).replace(",00", "")} />
            </Panel>
          </div>

          <Panel title="Participação na base anual" accent={NEON.cyan}>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {despesaCategorias.map((cat) => {
                const catTotal = despesasAnoPorCategoria.find((d) => d.name === cat.name)?.value ?? 0;
                const pct = despesasAnoTotal > 0 ? (catTotal / despesasAnoTotal) * 100 : 0;
                return (
                  <CategoryTile
                    key={cat.id}
                    label={cat.name}
                    percent={pct}
                    color={cat.color}
                    bars={categoryMonthly[cat.name] ?? new Array(12).fill(0)}
                  />
                );
              })}
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Análise Mensal" accent={NEON.cyan}>
              <div className="h-64" style={{ filter: `drop-shadow(0 0 8px ${NEON.cyan}44)` }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="label" stroke="#8b93a7" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#8b93a7"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tickFormatter={(v: number) => formatCurrencyCompact(v)}
                    />
                    <Tooltip
                      {...tooltipStyle()}
                      formatter={(value) => formatCurrency(Number(value))}
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#c3c7d4" }} />
                    <Bar dataKey="Salário" fill={NEON.cyan} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="Outras Receitas" fill={NEON.pink} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Detalhamento de Despesas" accent={NEON.pink}>
              <div className="flex gap-4">
                <div className="min-w-0 flex-1 space-y-3">
                  {categoryDetail.length === 0 && (
                    <p className="py-8 text-center text-sm text-[#8b93a7]">Sem despesas nessa categoria.</p>
                  )}
                  {categoryDetail.map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 truncate text-xs text-[#c3c7d4]">{item.label}</span>
                      <div className="h-2 flex-1 rounded-full bg-white/5">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${(item.value / categoryDetailMax) * 100}%`,
                            backgroundColor: colorForCategory(despesaCategorias, selectedCategory),
                            boxShadow: `0 0 8px ${colorForCategory(despesaCategorias, selectedCategory)}aa`,
                          }}
                        />
                      </div>
                      <span className="w-20 shrink-0 text-right text-xs text-white">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
                <ul className="w-28 shrink-0 space-y-1 border-l border-white/10 pl-3">
                  {despesaCategorias.map((cat) => (
                    <li key={cat.id}>
                      <button
                        onClick={() => setSelectedCategory(cat.name)}
                        className={cn(
                          "w-full rounded-lg px-2 py-1 text-left text-xs transition-all",
                          selectedCategory === cat.name ? "text-white" : "text-[#8b93a7] hover:text-white",
                        )}
                        style={
                          selectedCategory === cat.name
                            ? { background: `${cat.color}22`, boxShadow: `inset 0 0 0 1px ${cat.color}66` }
                            : undefined
                        }
                      >
                        {cat.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          </div>

          <Panel title="Receitas e Despesas" accent={NEON.violet}>
            <div className="h-64" style={{ filter: `drop-shadow(0 0 8px ${NEON.violet}44)` }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" stroke="#8b93a7" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#8b93a7"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(v: number) => formatCurrencyCompact(v)}
                  />
                  <Tooltip {...tooltipStyle()} formatter={(value) => formatCurrency(Number(value))} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#c3c7d4" }} />
                  <Line
                    type="monotone"
                    dataKey="Receita"
                    stroke={NEON.cyan}
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Despesa"
                    stroke={NEON.pink}
                    strokeWidth={2.5}
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

/** Card de vidro escuro com borda/halo neon na cor do acento. */
function NeonCard({
  accent,
  className,
  children,
}: {
  accent: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("relative rounded-2xl", className)}
      style={{
        padding: 1,
        background: `linear-gradient(150deg, ${accent}, ${accent}22 45%, rgba(255,255,255,0.05) 85%)`,
        boxShadow: `0 0 28px -14px ${accent}`,
      }}
    >
      <div className="h-full rounded-[15px] bg-[#0a0c14]/95 p-4 backdrop-blur-xl">{children}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  sparkline,
}: {
  label: string;
  value: string;
  accent: string;
  sparkline: { value: number }[];
}) {
  return (
    <NeonCard accent={accent}>
      <p className="text-xs text-[#8b93a7]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
      <div className="mt-2">
        <Sparkline data={sparkline} color={accent} />
      </div>
    </NeonCard>
  );
}

function Panel({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <NeonCard accent={accent}>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-4 w-1 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
        <p className="text-sm font-medium text-[#c3c7d4]">{title}</p>
      </div>
      {children}
    </NeonCard>
  );
}

/** Tile de categoria: ícone + nome + % (na cor) + mini barras neon. */
function CategoryTile({
  label,
  percent,
  color,
  bars,
}: {
  label: string;
  percent: number;
  color: string;
  bars: number[];
}) {
  const Icon = CATEGORY_ICONS[label] ?? Tag;
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-xl p-3 text-center"
      style={{
        background: `linear-gradient(160deg, ${color}14, rgba(255,255,255,0.02))`,
        boxShadow: `inset 0 0 0 1px ${color}55, 0 0 22px -14px ${color}`,
      }}
    >
      <Icon size={18} style={{ color, filter: `drop-shadow(0 0 6px ${color}aa)` }} />
      <span className="text-[11px] leading-tight text-[#8b93a7]">{label}</span>
      <span className="text-lg font-bold" style={{ color, textShadow: `0 0 12px ${color}88` }}>
        {percent.toFixed(0)}%
      </span>
      <MiniBars data={bars} color={color} />
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
