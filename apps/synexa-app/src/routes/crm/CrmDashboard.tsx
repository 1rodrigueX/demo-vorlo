import { useEffect, useState } from "react";
import { Users, KanbanSquare, Wallet, Target, type LucideIcon } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { formatBRL } from "@/lib/format";

type Deal = { value: number; status: "open" | "won" | "lost"; stage_id: string; closed_at: string | null; created_at: string };
type Stage = { id: string; name: string; color: string };

type State = {
  contacts: number;
  openCount: number;
  pipelineValue: number;
  conversion: number;
  revenue: { label: string; value: number }[];
  byStage: { name: string; count: number; color: string }[];
};

const IGNITE = "#ff5722";
const GRID = "rgba(255,255,255,0.06)";
const AXIS = "#7a6f66";

export function CrmDashboard() {
  const [s, setS] = useState<State | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [contactsRes, dealsRes, stagesRes] = await Promise.all([
        supabase.from("contacts").select("*", { count: "exact", head: true }),
        supabase.from("deals").select("value, status, stage_id, closed_at, created_at"),
        supabase.from("pipeline_stages").select("id, name, color").order("position"),
      ]);
      if (!alive) return;
      const deals = (dealsRes.data ?? []) as Deal[];
      const stages = (stagesRes.data ?? []) as Stage[];

      const open = deals.filter((d) => d.status === "open");
      const won = deals.filter((d) => d.status === "won");
      const lost = deals.filter((d) => d.status === "lost");
      const closed = won.length + lost.length;

      // Receita ganha nos últimos 6 meses.
      const now = new Date();
      const revenue = Array.from({ length: 6 }).map((_, i) => {
        const dt = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return { key: `${dt.getFullYear()}-${dt.getMonth()}`, label: dt.toLocaleDateString("pt-BR", { month: "short" }), value: 0 };
      });
      for (const d of won) {
        const dt = new Date(d.closed_at || d.created_at);
        const m = revenue.find((x) => x.key === `${dt.getFullYear()}-${dt.getMonth()}`);
        if (m) m.value += d.value || 0;
      }

      setS({
        contacts: contactsRes.count ?? 0,
        openCount: open.length,
        pipelineValue: open.reduce((sum, d) => sum + (d.value || 0), 0),
        conversion: closed ? Math.round((won.length / closed) * 100) : 0,
        revenue: revenue.map(({ label, value }) => ({ label, value })),
        byStage: stages.map((st) => ({ name: st.name, color: st.color, count: deals.filter((d) => d.stage_id === st.id).length })),
      });
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight text-white-soft">Dashboard</h1>
      <p className="mt-1 text-sm text-grey">Visão geral — dados ao vivo do seu CRM.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Contatos" display={s ? s.contacts.toLocaleString("pt-BR") : "—"} icon={Users} />
        <Stat label="Negócios abertos" display={s ? s.openCount.toLocaleString("pt-BR") : "—"} icon={KanbanSquare} />
        <Stat label="Valor no pipeline" display={s ? formatBRL(s.pipelineValue) : "—"} icon={Wallet} />
        <Stat label="Conversão" display={s ? `${s.conversion}%` : "—"} icon={Target} accent />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Receita ganha por mês" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={s?.revenue ?? []} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={IGNITE} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={IGNITE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="label" stroke={AXIS} tickLine={false} axisLine={false} fontSize={12} />
              <YAxis stroke={AXIS} tickLine={false} axisLine={false} fontSize={12} width={64}
                tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : `${v}`)} />
              <Tooltip
                cursor={{ stroke: GRID }}
                contentStyle={{ background: "#1c1611", border: "1px solid #2b241d", borderRadius: 10, color: "#f3ede6" }}
                labelStyle={{ color: "#a6998d" }}
                formatter={(v: number) => [formatBRL(v), "Receita"]}
              />
              <Area type="monotone" dataKey="value" stroke={IGNITE} strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Taxa de conversão">
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ v: s?.conversion ?? 0 }]} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background={{ fill: "#2b241d" }} dataKey="v" cornerRadius={999} fill={IGNITE} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tabular-nums text-white-soft">{s ? `${s.conversion}%` : "—"}</span>
              <span className="text-xs text-grey-dim">negócios ganhos</span>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Negócios por etapa" className="mt-4">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={s?.byStage ?? []} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="name" stroke={AXIS} tickLine={false} axisLine={false} fontSize={11} interval={0} />
            <YAxis stroke={AXIS} tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{ background: "#1c1611", border: "1px solid #2b241d", borderRadius: 10, color: "#f3ede6" }}
              labelStyle={{ color: "#a6998d" }}
              formatter={(v: number) => [v, "Negócios"]}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={54}>
              {(s?.byStage ?? []).map((st, i) => (
                <Cell key={i} fill={st.color || IGNITE} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}

function Stat({ label, display, icon: Icon, accent }: { label: string; display: string; icon: LucideIcon; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-carbon-800 bg-carbon-800 p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-grey-dim">{label}</span>
        <Icon size={16} className={accent ? "text-ignite" : "text-grey-dim"} />
      </div>
      <p className={`mt-3 text-2xl font-bold tabular-nums ${accent ? "text-ignite" : "text-white-soft"}`}>{display}</p>
    </div>
  );
}

function Panel({ title, className = "", children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border border-carbon-800 bg-carbon-800 p-5 ${className}`}>
      <h2 className="mb-4 text-sm font-semibold text-white-soft">{title}</h2>
      {children}
    </div>
  );
}
