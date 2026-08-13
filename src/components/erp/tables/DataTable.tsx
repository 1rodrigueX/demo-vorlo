"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { FilterBar } from "./FilterBar";
import { Pagination } from "./Pagination";
import { TableSkeleton } from "@/components/erp/loading/TableSkeleton";
import { EmptyState } from "@/components/erp/empty-state/EmptyState";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  /** Necessário pra habilitar ordenação nesta coluna (junto com `sortable: true`). */
  sortAccessor?: (row: T) => string | number;
  headerClassName?: string;
  cellClassName?: string;
};

type SortState = { key: string; direction: "asc" | "desc" } | null;

/**
 * Tabela genérica do ERP: busca client-side, filtros (slot), ordenação,
 * paginação, seleção de linhas e ações por linha. Usada por praticamente toda
 * página de lista (direto ou via ListPageTemplate).
 */
export function DataTable<T>({
  data,
  columns,
  getRowId,
  searchableFields,
  searchPlaceholder,
  filtersSlot,
  pageSize = 10,
  selectable = false,
  onSelectionChange,
  rowActions,
  onRowClick,
  isLoading = false,
  emptyState,
}: {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  searchableFields?: (keyof T)[];
  searchPlaceholder?: string;
  filtersSlot?: ReactNode;
  pageSize?: number;
  selectable?: boolean;
  onSelectionChange?: (ids: string[]) => void;
  rowActions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyState?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!query.trim() || !searchableFields?.length) return data;
    const q = query.trim().toLowerCase();
    return data.filter((row) => searchableFields.some((field) => String(row[field] ?? "").toLowerCase().includes(q)));
  }, [data, query, searchableFields]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortAccessor) return filtered;
    const accessor = col.sortAccessor;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      if (va < vb) return -1 * factor;
      if (va > vb) return 1 * factor;
      return 0;
    });
  }, [filtered, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, pageCount);
  const pageItems = sorted.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  function toggleSort(col: DataTableColumn<T>) {
    if (!col.sortable || !col.sortAccessor) return;
    setSort((prev) => {
      if (prev?.key !== col.key) return { key: col.key, direction: "asc" };
      if (prev.direction === "asc") return { key: col.key, direction: "desc" };
      return null;
    });
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectionChange?.([...next]);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelected((prev) => {
      const pageIds = pageItems.map(getRowId);
      const allSelected = pageIds.every((id) => prev.has(id));
      const next = new Set(prev);
      pageIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      onSelectionChange?.([...next]);
      return next;
    });
  }

  const alignClass = { left: "text-left", right: "text-right", center: "text-center" } as const;
  const allPageSelected = pageItems.length > 0 && pageItems.every((row) => selected.has(getRowId(row)));

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-panel">
      {(searchableFields?.length || filtersSlot) && (
        <FilterBar query={query} onQueryChange={handleQueryChange} placeholder={searchPlaceholder} filtersSlot={filtersSlot} />
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              {selectable && (
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleAllOnPage}
                    aria-label="Selecionar todos"
                    className="h-4 w-4 rounded border-gray-300 text-[#ff5722] focus:ring-[#ff5722]/30"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500",
                    alignClass[col.align ?? "left"],
                    col.headerClassName,
                  )}
                >
                  {col.sortable && col.sortAccessor ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col)}
                      className="inline-flex items-center gap-1 hover:text-gray-800"
                    >
                      {col.header}
                      {sort?.key === col.key ? (
                        sort.direction === "asc" ? (
                          <ChevronUp size={13} />
                        ) : (
                          <ChevronDown size={13} />
                        )
                      ) : (
                        <ChevronsUpDown size={13} className="text-gray-300" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
              {rowActions && <th className="w-10 px-4 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {isLoading ? null : pageItems.length === 0 ? null : (
              pageItems.map((row) => {
                const id = getRowId(row);
                return (
                  <tr
                    key={id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "border-b border-gray-50 last:border-0 hover:bg-gray-50/70",
                      onRowClick && "cursor-pointer",
                    )}
                  >
                    {selectable && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(id)}
                          onChange={() => toggleRow(id)}
                          aria-label="Selecionar linha"
                          className="h-4 w-4 rounded border-gray-300 text-[#ff5722] focus:ring-[#ff5722]/30"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3 text-gray-700",
                          alignClass[col.align ?? "left"],
                          col.cellClassName,
                        )}
                      >
                        {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "—")}
                      </td>
                    ))}
                    {rowActions && (
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {rowActions(row)}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {isLoading && <TableSkeleton columns={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} />}
        {!isLoading && pageItems.length === 0 && (
          emptyState ?? <EmptyState title="Nenhum resultado encontrado" description="Ajuste a busca ou os filtros." />
        )}
      </div>

      {!isLoading && pageItems.length > 0 && (
        <Pagination page={clampedPage} pageCount={pageCount} totalItems={sorted.length} pageSize={pageSize} onPageChange={setPage} />
      )}
    </div>
  );
}
