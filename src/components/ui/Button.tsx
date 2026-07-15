"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";
import { useTenantTheme } from "@/lib/theme/TenantThemeContext";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variantClasses: Record<Variant, string> = {
  primary: "text-white shadow-sm hover:brightness-110 disabled:opacity-50 disabled:shadow-none",
  secondary:
    "bg-white text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50 hover:border-gray-400 disabled:text-gray-400",
  ghost: "bg-transparent text-gray-600 hover:bg-gray-100 disabled:text-gray-300",
  danger:
    "bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-500 disabled:bg-red-300 disabled:shadow-none",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", isLoading, disabled, children, style, ...props },
    ref,
  ) => {
    const { brandColor } = useTenantTheme();
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        style={variant === "primary" ? { backgroundColor: brandColor, ...style } : style}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {isLoading ? "Salvando..." : children}
      </button>
    );
  },
);
Button.displayName = "Button";
