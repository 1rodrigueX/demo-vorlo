"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeContext";
import { cn } from "@/lib/utils/cn";

/** Botão sol/lua que alterna claro/escuro. Neutro pra funcionar tanto na
 * topbar clara quanto no header escuro da landing. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={isDark ? "Modo claro" : "Modo escuro"}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-panel text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900",
        className,
      )}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
