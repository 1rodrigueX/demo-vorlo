import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatBRL } from "@/lib/format";

type Stage = { id: string; name: string; color: string };
type Deal = { id: string; title: string; value: number; stage_id: string; contact: { name: string } | null };

export function Pipeline() {
  const [stages, setStages] = useState<Stage[] | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: st }, { data: dl }] = await Promise.all([
        supabase.from("pipeline_stages").select("id, name, color").order("position"),
        supabase.from("deals").select("id, title, value, stage_id, contact:contacts(name)").order("position"),
      ]);
      if (!alive) return;
      setStages((st ?? []) as unknown as Stage[]);
      setDeals((dl ?? []) as unknown as Deal[]);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const moveDeal = async (dealId: string, toStageId: string) => {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === toStageId) return;
    const from = deal.stage_id;
    // Atualização otimista + update direto no Supabase (RLS permite ao membro do tenant).
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage_id: toStageId } : d)));
    const { error } = await supabase.from("deals").update({ stage_id: toStageId }).eq("id", dealId);
    if (error) {
      setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage_id: from } : d)));
      alert("Não foi possível mover o negócio.");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight text-white-soft">Pipeline</h1>
        <p className="mt-1 text-sm text-grey">Negócios por etapa do funil.</p>
      </div>

      {stages === null ? (
        <div className="flex gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 w-64 shrink-0 animate-pulse rounded-2xl border border-carbon-800 bg-carbon-850" />
          ))}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-4">
          {stages.map((s) => {
            const cards = deals.filter((d) => d.stage_id === s.id);
            const total = cards.reduce((sum, d) => sum + (d.value || 0), 0);
            return (
              <div key={s.id} className="flex w-64 shrink-0 flex-col rounded-2xl border border-carbon-800 bg-carbon-950/50">
                <div className="flex items-center gap-2 border-b border-carbon-800 px-3.5 py-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="truncate text-sm font-semibold text-white-soft">{s.name}</span>
                  <span className="ml-auto text-xs text-grey-dim">{cards.length}</span>
                </div>
                <div
                  className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    moveDeal(e.dataTransfer.getData("dealId"), s.id);
                  }}
                >
                  {cards.length === 0 ? (
                    <p className="px-1 py-6 text-center text-xs text-grey-dim">Arraste um negócio aqui</p>
                  ) : (
                    cards.map((d) => (
                      <div
                        key={d.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("dealId", d.id)}
                        className="cursor-grab rounded-xl border border-carbon-800 bg-carbon-800 p-3 transition-colors hover:border-carbon-600 active:cursor-grabbing"
                      >
                        <p className="text-sm font-medium leading-snug text-white-soft">{d.title}</p>
                        {d.contact?.name && <p className="mt-1 text-xs text-grey">{d.contact.name}</p>}
                        <p className="mt-2 text-xs font-semibold tabular-nums text-ignite">{formatBRL(d.value)}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-carbon-800 px-3.5 py-2 text-right text-xs font-medium tabular-nums text-grey-dim">
                  {formatBRL(total)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
