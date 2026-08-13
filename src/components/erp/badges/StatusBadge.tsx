import { cn } from "@/lib/utils/cn";
import type { StatusMap } from "./statusMaps";

/** Badge de status genérico — recebe o valor e o mapa do domínio (ver statusMaps.ts). */
export function StatusBadge({
  status,
  map,
  size = "md",
  className,
}: {
  status: string;
  map: StatusMap;
  size?: "sm" | "md";
  className?: string;
}) {
  const entry = map[status] ?? { label: status, className: "bg-gray-100 text-gray-600 border border-gray-200" };
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center whitespace-nowrap rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        entry.className,
        className,
      )}
    >
      {entry.label}
    </span>
  );
}
