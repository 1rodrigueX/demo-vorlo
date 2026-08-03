import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils/cn";

interface CtaButtonProps extends ComponentPropsWithoutRef<"a"> {
  variant?: "primary" | "ghost" | "inverse";
  pulse?: boolean;
}

/** Botão do site público. Texto carbono sobre laranja (contraste AA). */
export const CtaButton = forwardRef<HTMLAnchorElement, CtaButtonProps>(function CtaButton(
  { className, variant = "primary", pulse = false, children, ...props },
  ref,
) {
  return (
    <a
      ref={ref}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2.5 rounded-full px-7 py-3.5 text-sm font-semibold tracking-tight transition-all duration-200 sm:text-[0.95rem]",
        variant === "primary" && "bg-ignite text-carbon-900 hover:brightness-110 hover:shadow-[0_0_34px_-4px_rgba(255,87,34,0.7)]",
        variant === "ghost" && "border border-carbon-600 text-white-soft hover:border-ignite hover:text-ignite",
        variant === "inverse" && "bg-carbon-900 text-white-soft hover:brightness-125",
        pulse && "cta-pulse",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
});
