import { Skeleton } from "./Skeleton";

/** Linhas fantasma no formato de uma tabela — usado pelo DataTable enquanto `isLoading`. */
export function TableSkeleton({ columns = 5, rows = 6 }: { columns?: number; rows?: number }) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className={c === 0 ? "h-4 w-32" : "h-4 flex-1"} />
          ))}
        </div>
      ))}
    </div>
  );
}
