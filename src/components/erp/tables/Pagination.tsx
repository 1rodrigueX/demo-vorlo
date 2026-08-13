import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Paginação client-side — usada dentro do DataTable. */
export function Pagination({
  page,
  pageCount,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row">
      <p className="text-xs text-gray-500">
        Mostrando <span className="font-medium text-gray-700">{start}–{end}</span> de{" "}
        <span className="font-medium text-gray-700">{totalItems}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500",
            page <= 1 ? "opacity-40" : "hover:bg-gray-50 hover:text-gray-900",
          )}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="px-2 text-xs font-medium text-gray-600">
          {page} / {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Próxima página"
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500",
            page >= pageCount ? "opacity-40" : "hover:bg-gray-50 hover:text-gray-900",
          )}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
