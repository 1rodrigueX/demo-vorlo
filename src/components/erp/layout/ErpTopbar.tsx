"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, HelpCircle, Menu, ChevronsUpDown, Check, Building2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { UserMenu } from "@/components/layout/UserMenu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LiteToggle } from "@/components/layout/LiteToggle";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { CURRENT_EMPRESA_COOKIE } from "@/lib/erp/empresaCookie";
import { markAllErpNotificacoesRead, markErpNotificacaoRead } from "@/lib/actions/erp-notificacoes";
import { formatRelative } from "@/lib/utils/dates";
import { formatDocument } from "@/components/erp/lib/format";
import type { ErpNotificacao, ErpEmpresa } from "@/types/domain";

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

/** Seletor de empresa/filial real — lê de erp_empresas (Cadastros > Empresas).
 * Sem nenhuma empresa cadastrada, some (nada pra escolher ainda). Com só
 * uma, mostra ela sozinha, sem fricção — o cookie é gravado mesmo assim,
 * pra Propostas sempre ter um default. */
function CompanySwitcher({ empresas, currentEmpresaId }: { empresas: ErpEmpresa[]; currentEmpresaId: string | null }) {
  const router = useRouter();
  const [selected, setSelected] = useState(() => currentEmpresaId ?? empresas[0]?.id ?? null);
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const current = empresas.find((c) => c.id === selected) ?? empresas[0];

  if (!empresas.length || !current) return null;

  function select(id: string) {
    setSelected(() => {
      document.cookie = `${CURRENT_EMPRESA_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
      return id;
    });
    setOpen(false);
    router.refresh();
  }

  if (empresas.length === 1) {
    return (
      <div className="hidden max-w-[220px] items-center gap-2 rounded-lg border border-gray-200 bg-panel px-3 py-1.5 text-sm md:flex">
        <Building2 size={14} className="shrink-0 text-gray-400" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-900">{current.name}</span>
      </div>
    );
  }

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
          {empresas.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => select(c.id)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-gray-900">{c.name}</span>
                <span className="block truncate text-xs text-gray-400">{formatDocument(c.cnpj)}</span>
              </span>
              {c.id === selected && <Check size={15} className="shrink-0 text-[#ff5722]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Só o evento "SDR montou uma proposta" usa notificação real por enquanto —
 * o resto do sino era mock e continua sem fonte de dado própria ainda. */
function NotificationsMenu({ initialNotifications }: { initialNotifications: ErpNotificacao[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    void markAllErpNotificacoesRead();
  }

  function handleOpenNotification(n: ErpNotificacao) {
    if (!n.read_at) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      void markErpNotificacaoRead(n.id);
    }
    setOpen(false);
  }

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
              <button type="button" onClick={handleMarkAllRead} className="text-xs font-medium text-[#ff5722] hover:underline">
                Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((n) => {
              const row = (
                <div className={cn("flex gap-2.5 px-4 py-2.5", !n.read_at && "bg-[#ff5722]/[0.03]")}>
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read_at ? "bg-gray-300" : "bg-[#ff5722]")} />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-medium text-gray-900">{n.message}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">{formatRelative(n.created_at)}</p>
                  </div>
                </div>
              );
              return n.link ? (
                <Link key={n.id} href={n.link} onClick={() => handleOpenNotification(n)} className="block hover:bg-gray-50">
                  {row}
                </Link>
              ) : (
                <button key={n.id} type="button" onClick={() => handleOpenNotification(n)} className="block w-full text-left hover:bg-gray-50">
                  {row}
                </button>
              );
            })}
            {notifications.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-400">Nenhuma notificação ainda.</p>}
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
  initialNotifications,
  empresas,
  currentEmpresaId,
}: {
  name: string;
  email: string;
  role?: string;
  onMenuClick: () => void;
  initialNotifications: ErpNotificacao[];
  empresas: ErpEmpresa[];
  currentEmpresaId: string | null;
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
        <CompanySwitcher empresas={empresas} currentEmpresaId={currentEmpresaId} />
        <Link
          href={`/${tenantSlug}/suporte`}
          aria-label="Ajuda"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-panel text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          <HelpCircle size={17} />
        </Link>
        <NotificationsMenu initialNotifications={initialNotifications} />
        <LiteToggle />
        <ThemeToggle />
        <UserMenu name={name} email={email} role={role} />
      </div>
    </header>
  );
}
