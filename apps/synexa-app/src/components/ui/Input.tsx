import type { InputHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-carbon-700 bg-carbon-800 px-3.5 py-2.5 text-sm text-white-soft outline-none transition-colors placeholder:text-grey-dim focus:border-ignite/60 focus:ring-2 focus:ring-ignite/20 ${className}`}
      {...props}
    />
  );
}
