import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          ref={ref}
          className={cn(
            "w-full rounded-md border bg-panel px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500",
            error ? "border-red-400" : "border-gray-300",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);
Select.displayName = "Select";
