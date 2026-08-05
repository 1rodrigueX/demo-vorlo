import { useEffect, useState } from "react";
import { Users, Building2, KanbanSquare, Wallet, type LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatBRL } from "@/lib/format";

type Data = {
  contacts: number;
  companies: number;
  deals: number;
  pipelineValue: number;
  byStage: { name: string; color: string; count: number }[];
};

export function CrmDashboard() {
  const [d, setD] = useState<Data | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [c, co, dl, stages, deals] = await Promise.all([
        supabase.from("contacts").select("*", { count: "exact", head: true }),
        supabase.from("companies").select("*", { count: "exact", head: true }),
        supabase.from("deals").select("*", { count: "exact", head: true }),
        supabase.from("pipeline_stages").select("id, name, color").order("position"),
        supabase.from("deals").select("stage_id, value"),
      ]);
      if (!alive) return;
      const dealRows = (deals.data ?? []) as { stage_id: string; value: number }[];
      const stageRows = (stages.data ?? []) as { id: string; name: string; color: string }[];
      const byStage = stageRows.map((s) => ({
        name: s.name,
        color: s.color,
        count: dealRows.filter((x) => x.stage_id === s.id).length,
      }));
      const pipelineValue = dealRows.reduce((sum, x) => sum + (x.value || 0), 0);
      setD({ contacts: c.count ?? 0, companies: co.count ?? 0, deals: dl.count ?? 0, pipelineValue, byStage });
    })();
    return () => {
      alive = false;
    };
  }, []);

  const maxCount = d ? Math.max(1, ...d.byStage.map((s) => s.count)) : 1;

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight text-white-soft">Dashboard</h1>
      <p className="mt-1 text-sm text-grey">Visão geral — dados ao vivo do seu CRM.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Contatos" display={d ? d.contacts.toLocaleString("pt-BR") : "—"} icon={Users} />
        <Stat label="Empresas" display={d ? d.companies.toLocaleString("pt-BR") : "—"} icon={Building2} />
        <Stat label="Negócios" display={d ? d.deals.toLocaleString("pt-BR") : "—"} icon={KanbanSquare} />
        <Stat label="Valor no pipeline" display={d ? formatBRL(d.pipelineValue) : "—"} icon={Wallet} />
      </div>

      <div className="mt-6 rounded-2xl border border-carbon-800 bg-carbon-800 p-5">
        <h2 className="text-sm font-semibold text-white-soft">Negócios por etapa</h2>
        <div className="mt-4 space-y-3">
          {d === null
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-2.5 animate-pulse rounded-full bg-carbon-700" />
              ))
            : d.byStage.map((s) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-sm text-grey">{s.name}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-carbon-700">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(s.count / maxCount) * 100}%`, background: s.color, minWidth: s.count ? "6px" : 0 }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm tabular-nums text-white-soft">{s.count}</span>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, display, icon: Icon }: { label: string; display: string; icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-carbon-800 bg-carbon-800 p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-grey-dim">{label}</span>
        <Icon size={16} className="text-grey-dim" />
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-white-soft">{display}</p>
    </div>
  );
}
