"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/lib/theme/ThemeContext";

/** Toaster do sonner seguindo o tema atual (claro/escuro). */
export function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster richColors position="top-right" theme={theme} />;
}
