import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Badge({ className, style, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        className,
      )}
      style={style}
      {...props}
    />
  );
}
