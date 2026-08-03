"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutGrid, LogOut, ChevronDown } from "lucide-react";
import { logout } from "@/lib/actions/auth";

/** Menu de perfil no header do site institucional (usuário logado):
 * "Meus acessos" (central de contas) + sair. Estilo carbono/ignite. */
export function SiteAccountMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const initials =
    name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  const first = name.split(" ")[0] || name;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-carbon-700 py-1 pl-1 pr-2.5 transition-colors hover:border-ignite"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-ignite text-[0.72rem] font-bold text-carbon-900">
          {initials}
        </span>
        <span className="hidden max-w-[8rem] truncate text-sm font-medium text-white-soft sm:block">{first}</span>
        <ChevronDown size={14} className="text-grey" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-carbon-700 bg-carbon-800 py-1 shadow-xl shadow-black/40">
          <div className="border-b border-carbon-700 px-4 py-2.5">
            <p className="truncate text-sm font-medium text-white-soft">{name}</p>
            <p className="text-[0.7rem] text-grey">Conta Synexa</p>
          </div>
          <a
            href="/central"
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-grey transition-colors hover:bg-carbon-700 hover:text-white-soft"
          >
            <LayoutGrid size={16} className="text-ignite" />
            Meus acessos
          </a>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-grey transition-colors hover:bg-carbon-700 hover:text-white-soft"
            >
              <LogOut size={16} />
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
