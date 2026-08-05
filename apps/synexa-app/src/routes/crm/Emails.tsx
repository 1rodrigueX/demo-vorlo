import { useEffect, useMemo, useState } from "react";
import { Search, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";

type Email = {
  id: string;
  subject: string | null;
  direction: "inbound" | "outbound";
  from_address: string;
  to_address: string;
  created_at: string;
  contact: { name: string } | null;
};

export function Emails() {
  const [rows, setRows] = useState<Email[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("email_messages")
        .select("id, subject, direction, from_address, to_address, created_at, contact:contacts(name)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (alive) setRows((data ?? []) as unknown as Email[]);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return null;
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((e) =>
      [e.subject, e.from_address, e.to_address, e.contact?.name].some((v) => v?.toLowerCase().includes(s)),
    );
  }, [rows, q]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white-soft">E-mails</h1>
          <p className="mt-1 text-sm text-grey">{rows ? `${rows.length} mensagens` : "Carregando…"}</p>
        </div>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-grey-dim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar e-mail…"
            className="w-64 rounded-lg border border-carbon-700 bg-carbon-800 py-2 pl-9 pr-3 text-sm text-white-soft outline-none placeholder:text-grey-dim focus:border-ignite/60"
          />
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-carbon-800">
        {filtered === null ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-carbon-800" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-12 text-center text-grey">Nenhum e-mail encontrado.</p>
        ) : (
          <ul>
            {filtered.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 border-b border-carbon-800/60 px-4 py-3 last:border-0 hover:bg-carbon-850"
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                    e.direction === "inbound" ? "bg-emerald-500/10 text-emerald-400" : "bg-ignite/10 text-ignite"
                  }`}
                >
                  {e.direction === "inbound" ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white-soft">{e.subject || "(sem assunto)"}</p>
                  <p className="truncate text-xs text-grey">
                    {e.direction === "inbound" ? e.from_address : e.to_address}
                    {e.contact?.name ? ` · ${e.contact.name}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-grey-dim">{formatDate(e.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
