"use client";

import { useState, type ReactNode } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Busca + slot de filtros — usado no topo do DataTable. Filtros extras viram painel recolhível no mobile. */
export function FilterBar({
  query,
  onQueryChange,
  placeholder = "Pesquisar...",
  filtersSlot,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
  filtersSlot?: ReactNode;
}) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 p-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            type="search"
            placeholder={placeholder}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#ff5722]/40 focus:bg-panel focus:outline-none focus:ring-2 focus:ring-[#ff5722]/15"
          />
        </div>
        {filtersSlot && (
          <>
            <div className="hidden items-center gap-2 sm:flex">{filtersSlot}</div>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((v) => !v)}
              aria-expanded={mobileFiltersOpen}
              aria-label="Filtros"
              className={cn(
                "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border sm:hidden",
                mobileFiltersOpen
                  ? "border-[#ff5722]/40 bg-[#ff5722]/10 text-[#ff5722]"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50",
              )}
            >
              <SlidersHorizontal size={16} />
            </button>
          </>
        )}
      </div>
      {filtersSlot && mobileFiltersOpen && (
        <div className="mt-3 flex flex-col gap-2 sm:hidden">{filtersSlot}</div>
      )}
    </div>
  );
}
