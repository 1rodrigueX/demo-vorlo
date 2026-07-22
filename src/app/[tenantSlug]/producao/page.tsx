import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, Factory, PackagePlus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTurnos, getMaquinas, getEstilos } from "@/lib/actions/producao-config";
import { getProdutos } from "@/lib/actions/producao-produtos";
import { formatCurrency } from "@/lib/utils/currency";

const NEON = {
  cyan: "#22d3ee",
  green: "#22c55e",
  red: "#f04f6a",
  violet: "#a855f7",
  blue: "#38bdf8",
  magenta: "#f24fa0",
  amber: "#f59e0b",
} as const;

// Cores de acento das ordens (esquerda de cada linha) e do status das máquinas.
const ORDER_ACCENTS = [NEON.green, NEON.blue, NEON.magenta, NEON.cyan];
const MAQUINA_STATUS: Record<string, { label: string; color: string; fill: number }> = {
  ativa: { label: "Ativa", color: NEON.green, fill: 100 },
  manutencao: { label: "Manutenção", color: NEON.amber, fill: 55 },
  parada: { label: "Parada", color: NEON.red, fill: 18 },
};

export default async function ProducaoPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: hasAccess } = await supabase.rpc("current_tenant_has_producao");
  if (!hasAccess) redirect("/comprar-producao");

  const [turnos, maquinas, estilos, produtos] = await Promise.all([
    getTurnos(),
    getMaquinas(),
    getEstilos(),
    getProdutos(),
  ]);

  const notConfigured = turnos.length === 0 || maquinas.length === 0 || produtos.length === 0;

  return (
    <div className="relative min-h-screen overflow-hidden px-6 py-6" style={{ background: "#05060c", color: "#e8eaf2" }}>
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
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Factory size={20} style={{ color: NEON.violet, filter: `drop-shadow(0 0 6px ${NEON.violet}aa)` }} />
            <h1 className="text-xl font-semibold text-white">Controle de Produção</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/${tenantSlug}/producao/configuracoes`}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-[#8b93a7] transition-colors hover:border-white/20 hover:text-white"
            >
              <Settings size={14} />
              Configurações
            </Link>
            <Link
              href={`/${tenantSlug}/producao/apontamento`}
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{
                background: `linear-gradient(135deg, ${NEON.magenta}, ${NEON.violet})`,
                boxShadow: `0 0 22px -6px ${NEON.magenta}`,
              }}
            >
              <PackagePlus size={14} />
              Lançar Produção
            </Link>
          </div>
        </div>

        {/* KPIs neon */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Turnos" value={turnos.length} accent={NEON.cyan} />
          <StatCard label="Máquinas" value={maquinas.length} accent={NEON.green} />
          <StatCard label="Estilos" value={estilos.length} accent={NEON.cyan} />
          <StatCard label="Produtos" value={produtos.length} accent={produtos.length === 0 ? NEON.red : NEON.violet} />
        </div>

        {/* Status das máquinas — versão honesta do "timeline" (status real, sem cronograma inventado) */}
        {maquinas.length > 0 && (
          <NeonCard accent={NEON.cyan} className="mt-4">
            <PanelHeading title="Status das máquinas" accent={NEON.cyan} />
            <div className="space-y-2.5">
              {maquinas.map((m) => {
                const st = MAQUINA_STATUS[m.status] ?? { label: m.status, color: NEON.cyan, fill: 60 };
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-sm text-[#c3c7d4]">{m.name}</span>
                    <div className="h-3 flex-1 rounded-full bg-white/5">
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{
                          width: `${st.fill}%`,
                          background: `linear-gradient(to right, ${st.color}, ${st.color}aa)`,
                          boxShadow: `0 0 12px ${st.color}aa`,
                        }}
                      />
                    </div>
                    <span
                      className="w-24 shrink-0 text-right text-xs font-medium"
                      style={{ color: st.color, textShadow: `0 0 10px ${st.color}66` }}
                    >
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </NeonCard>
        )}

        {/* Ordens de Produção Ativas — produtos reais com insumo/custo do estoque */}
        {produtos.length > 0 && (
          <NeonCard accent={NEON.magenta} className="mt-4">
            <PanelHeading title="Ordens de Produção Ativas" accent={NEON.magenta} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs text-[#8b93a7]">
                    <th className="pb-2 pr-3 font-normal">Produto</th>
                    <th className="pb-2 pr-3 font-normal">Insumo</th>
                    <th className="pb-2 pr-3 text-right font-normal">Qtd.</th>
                    <th className="pb-2 pr-3 text-right font-normal">Custo unit.</th>
                    <th className="pb-2 pr-3 text-right font-normal">Valor em estoque</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {produtos.map((p, i) => {
                    const insumo = p.estoque_item;
                    const custoUnit = insumo ? insumo.unit_cost_cents / 100 : 0;
                    const valorTotal = insumo ? (Number(insumo.quantity) * insumo.unit_cost_cents) / 100 : 0;
                    const accent = ORDER_ACCENTS[i % ORDER_ACCENTS.length];
                    return (
                      <tr key={p.id} className="border-b border-white/10 transition-colors last:border-0 hover:bg-white/[0.02]">
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="h-6 w-1 shrink-0 rounded-full"
                              style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
                            />
                            <span className="text-white">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 text-[#c3c7d4]">{insumo?.name ?? "—"}</td>
                        <td className="py-2.5 pr-3 text-right text-[#c3c7d4]">
                          {insumo ? `${Number(insumo.quantity)} ${insumo.unit}` : "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-[#c3c7d4]">{formatCurrency(custoUnit)}</td>
                        <td className="py-2.5 pr-3 text-right font-medium text-white">{formatCurrency(valorTotal)}</td>
                        <td className="py-2.5 text-right">
                          <Link
                            href={`/${tenantSlug}/producao/configuracoes`}
                            className="inline-flex text-[#8b93a7] transition-colors hover:text-white"
                            aria-label={`Editar ${p.name}`}
                          >
                            <Pencil size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </NeonCard>
        )}

        {notConfigured && (
          <NeonCard accent={NEON.violet} className="mt-4">
            <p className="text-center text-sm text-[#8b93a7]">
              Configure turnos, máquinas e produtos antes de começar a lançar produção.
            </p>
          </NeonCard>
        )}
      </div>
    </div>
  );
}

/** Card de vidro escuro com borda/halo neon. */
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
      className={["relative rounded-2xl", className].filter(Boolean).join(" ")}
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

function PanelHeading({ title, accent }: { title: string; accent: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="h-4 w-1 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
      <p className="text-sm font-medium text-[#c3c7d4]">{title}</p>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <NeonCard accent={accent}>
      <div className="text-center">
        <p className="text-3xl font-bold" style={{ color: accent, textShadow: `0 0 14px ${accent}77` }}>
          {value}
        </p>
        <p className="mt-1 text-xs text-[#8b93a7]">{label}</p>
      </div>
    </NeonCard>
  );
}
