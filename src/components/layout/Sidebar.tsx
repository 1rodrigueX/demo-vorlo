"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  KanbanSquare,
  Building2,
  Users,
  MessageCircle,
  Mail,
  Workflow,
  Sparkles,
  Lightbulb,
  Bug,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useTenantTheme } from "@/lib/theme/TenantThemeContext";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";

type NavLink = { href: string; label: string; icon: typeof LayoutDashboard };

const mainLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/companies", label: "Empresas", icon: Building2 },
  { href: "/contacts", label: "Contatos", icon: Users },
  { href: "/whatsapp", label: "Leads", icon: MessageCircle },
  { href: "/trajetorias", label: "Trajetórias", icon: Workflow },
  { href: "/emails", label: "E-mails", icon: Mail },
];

const helpLinks: NavLink[] = [
  { href: "/suporte", label: "Suporte", icon: Sparkles },
  { href: "/sugestoes", label: "Sugestões", icon: Lightbulb },
  { href: "/bugs", label: "Reportar bug", icon: Bug },
];

function NavItem({
  link,
  tenantSlug,
  pathname,
  brandColor,
  collapsed,
}: {
  link: NavLink;
  tenantSlug: string;
  pathname: string;
  brandColor: string;
  collapsed: boolean;
}) {
  const { href, label, icon: Icon } = link;
  const fullHref = `/${tenantSlug}${href}`;
  const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`);

  return (
    <Link
      href={fullHref}
      aria-current={isActive ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center rounded-lg py-2 text-sm font-medium transition-colors duration-150",
        collapsed ? "justify-center px-0" : "gap-3 px-3",
        isActive ? "text-white" : "text-white/55 hover:bg-white/[0.06] hover:text-white",
      )}
      style={isActive ? { backgroundColor: "rgba(255,87,34,0.13)" } : undefined}
    >
      {isActive && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
          style={{ backgroundColor: brandColor }}
        />
      )}
      <Icon
        size={18}
        strokeWidth={isActive ? 2.2 : 1.9}
        className={cn("shrink-0", isActive ? "" : "text-white/60 transition-colors group-hover:text-white/90")}
        style={isActive ? { color: brandColor } : undefined}
      />
      {collapsed ? (
        <>
          <span className="sr-only">{label}</span>
          {/* Tooltip só no modo recolhido: aparece à direita ao passar o mouse. */}
          <span
            role="tooltip"
            className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-md border border-white/10 bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
          >
            {label}
          </span>
        </>
      ) : (
        <span className="truncate">{label}</span>
      )}
    </Link>
  );
}

export function Sidebar({
  tenantName,
  logoUrl,
  showSettings = false,
  defaultCollapsed = false,
}: {
  tenantName: string;
  logoUrl?: string | null;
  showSettings?: boolean;
  defaultCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const tenantSlug = useTenantSlug();
  const { brandColor } = useTenantTheme();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      // Persistência sem "flash" na recarga: o layout (server) lê esse cookie e
      // já renderiza a sidebar no estado certo, então a hidratação bate.
      document.cookie = `sidebar_collapsed=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  };

  return (
    <aside
      style={{
        background:
          "radial-gradient(120% 55% at 50% 0%, rgba(255,87,34,0.16), transparent 60%), linear-gradient(165deg, #1a0f08 0%, #241610 55%, #140b06 100%)",
      }}
      className={cn(
        "hidden shrink-0 border-r border-white/5 transition-[width] duration-200 ease-in-out md:flex md:flex-col",
        collapsed ? "w-[68px] overflow-visible" : "w-64 overflow-hidden",
      )}
    >
      <div
        className={cn(
          "flex h-20 items-center border-b border-white/10",
          collapsed ? "justify-center px-0" : "gap-2.5 px-5",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-bold text-white shadow-sm transition-all duration-200",
            collapsed ? "h-10 w-10" : "h-12 w-20",
          )}
          style={logoUrl ? undefined : { backgroundColor: brandColor }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={tenantName} className="h-full w-full object-cover" />
          ) : (
            tenantName[0]?.toUpperCase() ?? "?"
          )}
        </div>
        {!collapsed && (
          <span className="truncate text-base font-semibold tracking-tight text-white">{tenantName}</span>
        )}
      </div>

      <nav className="flex flex-1 flex-col px-3 py-4">
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Menu</p>
        )}
        <div className="space-y-0.5">
          {mainLinks.map((link) => (
            <NavItem
              key={link.href}
              link={link}
              tenantSlug={tenantSlug}
              pathname={pathname}
              brandColor={brandColor}
              collapsed={collapsed}
            />
          ))}
        </div>

        <div className="my-3 h-px bg-white/[0.06]" />
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Ajuda</p>
        )}
        <div className="space-y-0.5">
          {helpLinks.map((link) => (
            <NavItem
              key={link.href}
              link={link}
              tenantSlug={tenantSlug}
              pathname={pathname}
              brandColor={brandColor}
              collapsed={collapsed}
            />
          ))}
        </div>

        <div className="mt-auto space-y-0.5 pt-3">
          <div className="mb-3 h-px bg-white/[0.06]" />
          {showSettings && (
            <NavItem
              link={{ href: "/settings", label: "Configurações", icon: Settings }}
              tenantSlug={tenantSlug}
              pathname={pathname}
              brandColor={brandColor}
              collapsed={collapsed}
            />
          )}
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            className={cn(
              "group relative flex w-full items-center rounded-lg py-2 text-sm font-medium text-white/55 transition-colors duration-150 hover:bg-white/[0.06] hover:text-white",
              collapsed ? "justify-center px-0" : "gap-3 px-3",
            )}
          >
            {collapsed ? (
              <ChevronsRight size={18} strokeWidth={1.9} className="shrink-0 text-white/60 group-hover:text-white/90" />
            ) : (
              <ChevronsLeft size={18} strokeWidth={1.9} className="shrink-0 text-white/60 group-hover:text-white/90" />
            )}
            {collapsed ? (
              <>
                <span className="sr-only">Expandir menu</span>
                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-md border border-white/10 bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
                >
                  Expandir
                </span>
              </>
            ) : (
              <span className="truncate">Recolher</span>
            )}
          </button>
        </div>
      </nav>
    </aside>
  );
}
