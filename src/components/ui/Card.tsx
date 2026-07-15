import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200/80 bg-panel shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)]",
        className,
      )}
      {...props}
    />
  );
}
