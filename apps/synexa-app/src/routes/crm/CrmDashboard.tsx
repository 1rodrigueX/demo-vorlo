import { useEffect, useState } from "react";
import { Users, Building2, KanbanSquare, type LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Stats = { contacts: number; companies: number; deals: number };

export function CrmDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [c, co, d] = await Promise.all([
        supabase.from("contacts").select("*", { count: "exact", head: true }),
        supabase.from("companies").select("*", { count: "exact", head: true }),
        supabase.from("deals").select("*", { count: "exact", head: true }),
      ]);
      if (!alive) return;
      setStats({ contacts: c.count ?? 0, companies: co.count ?? 0, deals: d.count ?? 0 });
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight text-white-soft">Dashboard</h1>
      <p className="mt-1 text-sm text-grey">Visão geral — dados ao vivo do seu CRM.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Contatos" value={stats?.contacts} icon={Users} />
        <Stat label="Empresas" value={stats?.companies} icon={Building2} />
        <Stat label="Negócios" value={stats?.deals} icon={KanbanSquare} />
      </div>

      <div className="mt-6 rounded-2xl border border-carbon-800 bg-carbon-850 p-5 text-sm text-grey">
        Gráficos, funil e propostas chegam na <span className="text-white-soft">Fase 2</span>, portados do CRM web.
        A casca e os dados ao vivo já estão de pé.
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value?: number; icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-carbon-800 bg-carbon-800 p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-grey-dim">{label}</span>
        <Icon size={16} className="text-grey-dim" />
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums text-white-soft">
        {value === undefined ? "—" : value.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}
