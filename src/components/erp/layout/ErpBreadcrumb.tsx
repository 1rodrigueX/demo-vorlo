import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = { label: string; href?: string };

/** Trilha de navegação — item sem `href` é o atual (não-clicável). `href` já vem SEM o prefixo do tenant. */
export function ErpBreadcrumb({ items, tenantSlug }: { items: BreadcrumbItem[]; tenantSlug: string }) {
  return (
    <nav aria-label="Trilha de navegação" className="mb-1 flex items-center gap-1.5 text-xs text-gray-500">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={item.label + i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} className="shrink-0 text-gray-300" />}
            {item.href && !isLast ? (
              <Link href={`/${tenantSlug}${item.href}`} className="hover:text-gray-900 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-gray-700" : undefined}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
