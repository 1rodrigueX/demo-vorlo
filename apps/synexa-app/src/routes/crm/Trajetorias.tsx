import { useEffect, useState } from "react";
import { Workflow } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";

type Flow = {
  id: string;
  name: string;
  status: "draft" | "active";
  updated_at: string;
  graph: { nodes?: unknown[] } | null;
};

export function Trajetorias() {
  const [rows, setRows] = useState<Flow[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("automation_flows")
        .select("id, name, status, updated_at, graph")
        .order("updated_at", { ascending: false });
      if (alive) setRows((data ?? []) as unknown as Flow[]);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <h1 className="text-xl font-bold tracking-tight text-white-soft">Trajetórias</h1>
        <span className="rounded-full bg-ignite/10 px-2 py-0.5 text-[11px] font-medium text-ignite">Beta</span>
      </div>
      <p className="mt-1 text-sm text-grey">Automações do seu atendimento (gatilho → ações).</p>

      {rows === null ? (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-carbon-800 bg-carbon-850" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-6 grid place-items-center rounded-2xl border border-carbon-800 bg-carbon-850 px-6 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ignite/10 text-ignite">
            <Workflow size={24} />
          </span>
          <p className="mt-3 text-sm font-semibold text-white-soft">Nenhuma trajetória ainda</p>
          <p className="mt-1 max-w-xs text-sm text-grey">
            Crie automações no CRM web — o editor visual chega ao app numa próxima fase.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((f) => {
            const steps = Array.isArray(f.graph?.nodes) ? f.graph!.nodes!.length : 0;
            return (
              <div key={f.id} className="flex flex-col rounded-2xl border border-carbon-800 bg-carbon-800 p-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ignite/10 text-ignite">
                    <Workflow size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white-soft">{f.name}</p>
                    <p className="text-xs text-grey-dim">
                      {steps} {steps === 1 ? "passo" : "passos"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  {f.status === "active" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Ativa
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-carbon-700 px-2 py-0.5 text-[11px] font-medium text-grey">
                      <span className="h-1.5 w-1.5 rounded-full bg-grey-dim" /> Rascunho
                    </span>
                  )}
                  <span className="text-[11px] text-grey-dim">Editada em {formatDate(f.updated_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
