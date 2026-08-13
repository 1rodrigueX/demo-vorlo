"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronsLeft, ChevronsRight, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ERP_DASHBOARD_ITEM, ERP_NAV_GROUPS, ERP_FOOTER_ITEMS, type ErpNavGroup, type ErpNavItem } from "./erpNavConfig";

const COLLAPSE_COOKIE = "erp_sidebar_collapsed";
const OPEN_GROUPS_KEY = "erp_sidebar_open_groups";

function isItemActive(pathname: string, tenantSlug: string, href: string): boolean {
  const full = `/${tenantSlug}${href}`;
  return pathname === full || pathname.startsWith(`${full}/`);
}

function NavLink({
  item,
  tenantSlug,
  pathname,
  collapsed,
}: {
  item: ErpNavItem;
  tenantSlug: string;
  pathname: string;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  const active = isItemActive(pathname, tenantSlug, item.href);

  return (
    <Link
      href={`/${tenantSlug}${item.href}`}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center rounded-lg py-2 text-sm font-medium transition-colors duration-150",
        collapsed ? "justify-center px-0" : "gap-2.5 px-3",
        active ? "bg-[#ff5722]/10 text-[#ff5722]" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
      )}
    >
      <Icon size={17} strokeWidth={active ? 2.2 : 1.9} className="shrink-0" />
      {collapsed ? (
        <>
          <span className="sr-only">{item.label}</span>
          <span
            role="tooltip"
            className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-md border border-gray-200 bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
          >
            {item.label}
          </span>
        </>
      ) : (
        <>
          <span className="truncate">{item.label}</span>
          {item.badge && (
            <span className="ml-auto rounded-full bg-[#ff5722]/15 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide text-[#ff5722]">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

function NavGroup({
  group,
  tenantSlug,
  pathname,
  collapsed,
  open,
  onToggle,
}: {
  group: ErpNavGroup;
  tenantSlug: string;
  pathname: string;
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const GroupIcon = group.icon;
  const hasActiveChild = group.items.some((i) => isItemActive(pathname, tenantSlug, i.href));

  if (collapsed) {
    // Colapsado: cada item do grupo vira um link direto (sem accordion, sem
    // rótulo de grupo) — evita ter que abrir a sidebar pra navegar.
    return (
      <div className="space-y-0.5">
        {group.items.map((item) => (
          <NavLink key={item.href + item.label} item={item} tenantSlug={tenantSlug} pathname={pathname} collapsed />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
          hasActiveChild ? "text-gray-900" : "text-gray-500 hover:text-gray-900",
        )}
      >
        <GroupIcon size={17} strokeWidth={1.9} className="shrink-0" />
        <span className="flex-1 truncate text-left">{group.label}</span>
        <ChevronDown
          size={15}
          className={cn("shrink-0 transition-transform duration-150", open ? "rotate-0" : "-rotate-90")}
        />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5 pl-3">
          {group.items.map((item) => (
            <NavLink key={item.href + item.label} item={item} tenantSlug={tenantSlug} pathname={pathname} collapsed={false} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ErpSidebar({ tenantSlug, defaultCollapsed = false }: { tenantSlug: string; defaultCollapsed?: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(ERP_NAV_GROUPS.map((g) => g.id)));
  const [hydrated, setHydrated] = useState(false);

  // Restaura grupos abertos/fechados do localStorage + garante que o grupo do
  // item ativo esteja aberto — só depois de montar (localStorage não existe no servidor).
  useEffect(() => {
    let restored: Set<string> | null = null;
    try {
      const raw = localStorage.getItem(OPEN_GROUPS_KEY);
      if (raw) restored = new Set(JSON.parse(raw) as string[]);
    } catch {
      /* localStorage indisponível — segue com tudo aberto */
    }
    const activeGroup = ERP_NAV_GROUPS.find((g) => g.items.some((i) => isItemActive(pathname, tenantSlug, i.href)));
    const next = restored ?? new Set(ERP_NAV_GROUPS.map((g) => g.id));
    if (activeGroup) next.add(activeGroup.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenGroups(next);
    setHydrated(true);
    // Só na montagem — reabrir o grupo ativo a cada navegação seria irritante
    // (o usuário pode querer fechar um grupo e continuar navegando dentro dele).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify([...next]));
      } catch {
        /* ignora */
      }
      return next;
    });
  }

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      document.cookie = `${COLLAPSE_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "relative z-40 hidden shrink-0 border-r border-gray-200 bg-panel transition-[width] duration-200 ease-in-out md:flex md:flex-col",
        collapsed ? "w-[68px] overflow-visible" : "w-64 overflow-hidden",
      )}
    >
      <div className={cn("flex h-16 shrink-0 items-center border-b border-gray-200", collapsed ? "justify-center px-0" : "gap-2.5 px-5")}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ff5722] text-sm font-bold text-white">
          <LayoutGrid size={18} strokeWidth={2.2} />
        </div>
        {!collapsed && <span className="truncate text-base font-semibold tracking-tight text-gray-900">ERP</span>}
      </div>

      <nav className={cn("flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4", !hydrated && "invisible")}>
        <NavLink item={ERP_DASHBOARD_ITEM} tenantSlug={tenantSlug} pathname={pathname} collapsed={collapsed} />
        <div className="my-2 h-px bg-gray-100" />
        <div className="space-y-3">
          {ERP_NAV_GROUPS.map((group) => (
            <NavGroup
              key={group.id}
              group={group}
              tenantSlug={tenantSlug}
              pathname={pathname}
              collapsed={collapsed}
              open={openGroups.has(group.id)}
              onToggle={() => toggleGroup(group.id)}
            />
          ))}
        </div>
        <div className="my-2 h-px bg-gray-100" />
        <div className="space-y-0.5">
          {ERP_FOOTER_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} tenantSlug={tenantSlug} pathname={pathname} collapsed={collapsed} />
          ))}
        </div>

        <div className="mt-auto pt-3">
          <div className="mb-3 h-px bg-gray-100" />
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            className={cn(
              "group relative flex w-full items-center rounded-lg py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900",
              collapsed ? "justify-center px-0" : "gap-2.5 px-3",
            )}
          >
            {collapsed ? <ChevronsRight size={17} strokeWidth={1.9} /> : <ChevronsLeft size={17} strokeWidth={1.9} />}
            {!collapsed && <span className="truncate">Recolher</span>}
          </button>
        </div>
      </nav>
    </aside>
  );
}
