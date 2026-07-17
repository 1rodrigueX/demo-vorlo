"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useTenantTheme } from "@/lib/theme/TenantThemeContext";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";

const TABS = [
  { href: "/suporte", label: "Assistente" },
  { href: "/suporte/tutoriais", label: "Tutoriais" },
  { href: "/suporte/videos", label: "Vídeos" },
];

export function SuporteNavTabs() {
  const pathname = usePathname();
  const tenantSlug = useTenantSlug();
  const { brandColor } = useTenantTheme();

  return (
    <nav className="flex gap-1 border-b border-gray-200">
      {TABS.map((tab) => {
        const fullHref = `/${tenantSlug}${tab.href}`;
        const isActive = pathname === fullHref;
        return (
          <Link
            key={tab.href}
            href={fullHref}
            style={isActive ? { borderColor: brandColor, color: brandColor } : undefined}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "" : "border-transparent text-gray-500 hover:text-gray-900",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
