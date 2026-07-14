"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";

export function UserMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-gray-50"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-medium text-white shadow-sm shadow-indigo-600/25">
          {initials || "?"}
        </div>
        <div className="hidden text-left sm:block">
          <p className="max-w-[9rem] truncate text-sm font-medium text-gray-900">{name}</p>
          <p className="text-xs text-gray-400">Membro da equipe</p>
        </div>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-lg shadow-gray-900/5">
          <div className="border-b border-gray-100 px-4 py-2.5">
            <p className="truncate text-sm font-medium text-gray-900">{name}</p>
            <p className="truncate text-xs text-gray-500">{email}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
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
