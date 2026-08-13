"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Bell, HelpCircle, Menu, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { UserMenu } from "@/components/layout/UserMenu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LiteToggle } from "@/components/layout/LiteToggle";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { getMockCompanies, getMockNotifications, type NotificationTone } from "@/mocks/erp/session";
import { formatRelative } from "@/lib/utils/dates";

const TONE_DOT: Record<NotificationTone, string> = {
  info: "bg-sky-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

function useClickOutside<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);
  return ref;
}

function CompanySwitcher() {
  const companies = getMockCompanies();
  const [selected, setSelected] = useState(companies[0].id);
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const current = companies.find((c) => c.id === selected) ?? companies[0];

  return (
    <div className="relative hidden md:block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[220px] items-center gap-2 rounded-lg border border-gray-200 bg-panel px-3 py-1.5 text-left text-sm hover:bg-gray-50"
      >
        <span className="min-w-0 flex-1 truncate">
          <span className="block truncate text-xs font-medium text-gray-900">{current.name}</span>
        </span>
        <ChevronsUpDown size={14} className="shrink-0 text-gray-400" />
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-72 rounded-xl border border-gray-200 bg-panel py-1 shadow-lg shadow-gray-900/5">
          <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Empresa / filial</p>
          {companies.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setSelected(c.id);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-gray-900">{c.name}</span>
                <span className="block truncate text-xs text-gray-400">{c.cnpj}</span>
              </span>
              {c.id === selected && <Check size={15} className="shrink-0 text-[#ff5722]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationsMenu() {
  const [notifications, setNotifications] = useState(getMockNotifications());
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificações"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-panel text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff5722] px-1 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 bg-panel py-1 shadow-lg shadow-gray-900/5">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-gray-900">Notificações</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
                className="text-xs font-medium text-[#ff5722] hover:underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <div key={n.id} className={cn("flex gap-2.5 px-4 py-2.5", !n.read && "bg-[#ff5722]/[0.03]")}>
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TONE_DOT[n.tone])} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{n.title}</p>
                  <p className="line-clamp-2 text-xs text-gray-500">{n.description}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">{formatRelative(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ErpTopbar({
  name,
  email,
  role,
  onMenuClick,
}: {
  name: string;
  email: string;
  role?: string;
  onMenuClick: () => void;
}) {
  const tenantSlug = useTenantSlug();
  const [query, setQuery] = useState("");

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 bg-panel px-4 md:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Abrir menu"
        className="text-gray-500 md:hidden"
      >
        <Menu size={22} />
      </button>

      <div className="relative hidden max-w-sm flex-1 md:block">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder="Pesquisar clientes, produtos, pedidos..."
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#ff5722]/40 focus:bg-panel focus:outline-none focus:ring-2 focus:ring-[#ff5722]/15"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <CompanySwitcher />
        <Link
          href={`/${tenantSlug}/suporte`}
          aria-label="Ajuda"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-panel text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          <HelpCircle size={17} />
        </Link>
        <NotificationsMenu />
        <LiteToggle />
        <ThemeToggle />
        <UserMenu name={name} email={email} role={role} />
      </div>
    </header>
  );
}
