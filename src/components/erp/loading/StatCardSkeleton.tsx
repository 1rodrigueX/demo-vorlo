import { Skeleton } from "./Skeleton";

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-panel p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2.5 h-7 w-28" />
    </div>
  );
}

/** Grid de KPIs em loading — usado nos dashboards enquanto "carregam". */
export function StatCardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}
