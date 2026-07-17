"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, KanbanSquare, Building2, MessageCircle, Mail, Sparkles, Lightbulb, Settings } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useTenantTheme } from "@/lib/theme/TenantThemeContext";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";

const baseLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/companies", label: "Empresas", icon: Building2 },
  { href: "/whatsapp", label: "Leads", icon: MessageCircle },
  { href: "/emails", label: "E-mails", icon: Mail },
  { href: "/suporte", label: "Suporte", icon: Sparkles },
  { href: "/sugestoes", label: "Sugestões", icon: Lightbulb },
  // Música desativada temporariamente — ver (dashboard)/layout.tsx.
  // { href: "/musica", label: "Música", icon: Music2 },
];

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
  const links = showSettings
    ? [...baseLinks, { href: "/settings", label: "Configurações", icon: Settings }]
    : baseLinks;

  return (
    <aside
      style={{ background: "linear-gradient(160deg, #0b1220, #16213a)" }}
      className="hidden w-64 shrink-0 md:flex md:flex-col"
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
      <nav className="flex-1 space-y-1 px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Menu</p>
        {links.map(({ href, label, icon: Icon }) => {
          const fullHref = `/${tenantSlug}${href}`;
          const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`);
          return (
            <Link
              key={href}
              href={fullHref}
              style={isActive ? { backgroundColor: brandColor } : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "text-white shadow-md shadow-black/20"
                  : "text-white/70 hover:translate-x-0.5 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.25 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
