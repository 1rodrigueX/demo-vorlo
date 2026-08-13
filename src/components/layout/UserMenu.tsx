"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Wrench, DoorOpen, LayoutGrid, ShieldCheck, Users } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { exitDevView } from "@/lib/actions/dev-view";
import { useTenantTheme } from "@/lib/theme/TenantThemeContext";
import { ROLE_LABEL } from "@/lib/utils/roles";

export function UserMenu({
  name,
  email,
  role,
  isDev = false,
  isDevViewing = false,
}: {
  name: string;
  email: string;
  role?: string;
  isDev?: boolean;
  isDevViewing?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { brandColor } = useTenantTheme();
  const router = useRouter();
  const [isExiting, startExit] = useTransition();

  function handleExitDevView() {
    startExit(async () => {
      await exitDevView();
      router.push("/dev");
    });
  }

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
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white shadow-sm"
          style={{ backgroundColor: brandColor }}
        >
          {initials || "?"}
        </div>
        <div className="hidden text-left sm:block">
          <p className="max-w-[9rem] truncate text-sm font-medium text-gray-900">{name}</p>
          <p className="text-xs text-gray-400">{(role && ROLE_LABEL[role]) || "Membro da equipe"}</p>
        </div>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-panel py-1 shadow-lg shadow-gray-900/5">
          <div className="border-b border-gray-100 px-4 py-2.5">
            <p className="truncate text-sm font-medium text-gray-900">{name}</p>
            <p className="truncate text-xs text-gray-500">{email}</p>
          </div>
          {!isDevViewing && (
            <>
              <Link
                href="/central"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <LayoutGrid size={16} />
                Central Vorlo
              </Link>
              <Link
                href="/central/seguranca"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <ShieldCheck size={16} />
                Segurança
              </Link>
              {role === "owner" && (
                <Link
                  href="/central/usuarios"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Users size={16} />
                  Usuários
                </Link>
              )}
            </>
          )}
          {isDev && (
            <Link
              href="/dev"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Wrench size={16} />
              Painel Dev
            </Link>
          )}
          {isDevViewing && (
            <button
              type="button"
              disabled={isExiting}
              onClick={handleExitDevView}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <DoorOpen size={16} />
              Sair da visualização
            </button>
          )}
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
