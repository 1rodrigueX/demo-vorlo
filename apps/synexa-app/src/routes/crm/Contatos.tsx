import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  company: { name: string } | null;
};

export function Contatos() {
  const [rows, setRows] = useState<Contact[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id, name, email, phone, created_at, company:companies(name)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (alive) setRows((data ?? []) as unknown as Contact[]);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return null;
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((c) =>
      [c.name, c.email, c.phone, c.company?.name].some((v) => v?.toLowerCase().includes(s)),
    );
  }, [rows, q]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white-soft">Contatos</h1>
          <p className="mt-1 text-sm text-grey">{rows ? `${rows.length} no total` : "Carregando…"}</p>
        </div>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-grey-dim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar contato…"
            className="w-64 rounded-lg border border-carbon-700 bg-carbon-800 py-2 pl-9 pr-3 text-sm text-white-soft outline-none placeholder:text-grey-dim focus:border-ignite/60"
          />
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-carbon-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-carbon-800 text-left text-[11px] uppercase tracking-wider text-grey-dim">
                <th className="px-4 py-3 font-semibold">Nome</th>
                <th className="px-4 py-3 font-semibold">E-mail</th>
                <th className="px-4 py-3 font-semibold">Telefone</th>
                <th className="px-4 py-3 font-semibold">Empresa</th>
                <th className="px-4 py-3 font-semibold">Criado</th>
              </tr>
            </thead>
            <tbody>
              {filtered === null ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-carbon-800/60">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-carbon-800" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-grey">
                    Nenhum contato encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-b border-carbon-800/60 last:border-0 hover:bg-carbon-850">
                    <td className="px-4 py-3 font-medium text-white-soft">{c.name}</td>
                    <td className="px-4 py-3 text-grey">{c.email || "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-grey">{c.phone || "—"}</td>
                    <td className="px-4 py-3 text-grey">{c.company?.name || "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-grey-dim">{formatDate(c.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
