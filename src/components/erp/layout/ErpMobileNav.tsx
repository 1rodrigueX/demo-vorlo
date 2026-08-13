"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ERP_DASHBOARD_ITEM, ERP_NAV_GROUPS, ERP_FOOTER_ITEMS } from "./erpNavConfig";

/** Drawer de navegação do ERP no mobile — abre por cima de tudo, sem accordion (lista corrida por grupo, mais simples de rolar no dedo). */
export function ErpMobileNav({ tenantSlug, open, onClose }: { tenantSlug: string; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  if (!open) return null;

  const isActive = (href: string) => {
    const full = `/${tenantSlug}${href}`;
    return pathname === full || pathname.startsWith(`${full}/`);
  };

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative flex h-full w-[86%] max-w-xs flex-col overflow-y-auto border-r border-gray-200 bg-panel">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ff5722] text-white">
              <LayoutGrid size={18} strokeWidth={2.2} />
            </div>
            <span className="text-base font-semibold text-gray-900">ERP</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar menu" className="text-gray-500">
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 space-y-4 px-3 py-4">
          <Link
            href={`/${tenantSlug}${ERP_DASHBOARD_ITEM.href}`}
            onClick={onClose}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
              isActive(ERP_DASHBOARD_ITEM.href) ? "bg-[#ff5722]/10 text-[#ff5722]" : "text-gray-700 hover:bg-gray-100",
            )}
          >
            <ERP_DASHBOARD_ITEM.icon size={17} />
            {ERP_DASHBOARD_ITEM.label}
          </Link>

          {ERP_NAV_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.href + item.label}
                    href={`/${tenantSlug}${item.href}`}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
                      isActive(item.href) ? "bg-[#ff5722]/10 text-[#ff5722]" : "text-gray-700 hover:bg-gray-100",
                    )}
                  >
                    <item.icon size={17} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <div>
            <div className="mb-2 h-px bg-gray-100" />
            <div className="space-y-0.5">
              {ERP_FOOTER_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={`/${tenantSlug}${item.href}`}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
                    isActive(item.href) ? "bg-[#ff5722]/10 text-[#ff5722]" : "text-gray-700 hover:bg-gray-100",
                  )}
                >
                  <item.icon size={17} />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
