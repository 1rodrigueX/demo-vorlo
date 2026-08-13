import { cn } from "@/lib/utils/cn";

/** Bloco fantasma — primitivo usado por TableSkeleton/StatCardSkeleton e diretamente onde precisar. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-gray-100", className)} />;
}
