"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, KanbanSquare, Building2, MessageCircle, Mail, Sparkles, Settings } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useTenantTheme } from "@/lib/theme/TenantThemeContext";

const baseLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/companies", label: "Empresas", icon: Building2 },
  { href: "/whatsapp", label: "Leads", icon: MessageCircle },
  { href: "/emails", label: "E-mails", icon: Mail },
  { href: "/suporte", label: "Suporte", icon: Sparkles },
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
  const { brandColor } = useTenantTheme();
  const links = showSettings
    ? [...baseLinks, { href: "/settings", label: "Configurações", icon: Settings }]
    : baseLinks;

  return (
    <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-panel md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-gray-200 px-5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-bold text-white shadow-sm"
          style={logoUrl ? undefined : { backgroundColor: brandColor }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={tenantName} className="h-full w-full object-cover" />
          ) : (
            tenantName[0]?.toUpperCase() ?? "?"
          )}
        </div>
        <span className="truncate text-base font-semibold tracking-tight text-gray-900">
          {tenantName}
        </span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Menu
        </p>
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              style={isActive ? { backgroundColor: brandColor } : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "text-white shadow-sm" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
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
