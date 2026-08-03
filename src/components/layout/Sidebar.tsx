"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  KanbanSquare,
  Building2,
  Users,
  MessageCircle,
  Mail,
  Sparkles,
  Lightbulb,
  Bug,
  Settings,
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
}: {
  link: NavLink;
  tenantSlug: string;
  pathname: string;
  brandColor: string;
}) {
  const { href, label, icon: Icon } = link;
  const fullHref = `/${tenantSlug}${href}`;
  const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`);

  return (
    <Link
      href={fullHref}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
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
        className={isActive ? "" : "text-white/60 transition-colors group-hover:text-white/90"}
        style={isActive ? { color: brandColor } : undefined}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function Sidebar({
  tenantName,
  logoUrl,
  showSettings = false,
}: {
  tenantName: string;
  logoUrl?: string | null;
  showSettings?: boolean;
}) {
  const pathname = usePathname();
  const tenantSlug = useTenantSlug();
  const { brandColor } = useTenantTheme();

  return (
    <aside
      style={{
        background:
          "radial-gradient(120% 55% at 50% 0%, rgba(255,87,34,0.16), transparent 60%), linear-gradient(165deg, #1a0f08 0%, #241610 55%, #140b06 100%)",
      }}
      className="hidden w-64 shrink-0 border-r border-white/5 md:flex md:flex-col"
    >
      <div className="flex h-20 items-center gap-2.5 border-b border-white/10 px-5">
        <div
          className="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-bold text-white shadow-sm"
          style={logoUrl ? undefined : { backgroundColor: brandColor }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={tenantName} className="h-full w-full object-cover" />
          ) : (
            tenantName[0]?.toUpperCase() ?? "?"
          )}
        </div>
        <span className="truncate text-base font-semibold tracking-tight text-white">{tenantName}</span>
      </div>

      <nav className="flex flex-1 flex-col px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Menu</p>
        <div className="space-y-0.5">
          {mainLinks.map((link) => (
            <NavItem key={link.href} link={link} tenantSlug={tenantSlug} pathname={pathname} brandColor={brandColor} />
          ))}
        </div>

        <div className="my-3 h-px bg-white/[0.06]" />
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Ajuda</p>
        <div className="space-y-0.5">
          {helpLinks.map((link) => (
            <NavItem key={link.href} link={link} tenantSlug={tenantSlug} pathname={pathname} brandColor={brandColor} />
          ))}
        </div>

        {showSettings && (
          <div className="mt-auto pt-3">
            <div className="mb-3 h-px bg-white/[0.06]" />
            <NavItem
              link={{ href: "/settings", label: "Configurações", icon: Settings }}
              tenantSlug={tenantSlug}
              pathname={pathname}
              brandColor={brandColor}
            />
          </div>
        )}
      </nav>
    </aside>
  );
}
