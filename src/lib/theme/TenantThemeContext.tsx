"use client";

import { createContext, useContext } from "react";

/** Cor de marca única do sistema — não é mais customizável por tenant.
 * Laranja "ignite" #ff5722, igual ao site — casa com a rampa indigo do globals.css. */
export const BRAND_COLOR = "#ff5722";

const TenantThemeContext = createContext<{ brandColor: string }>({ brandColor: BRAND_COLOR });

export function TenantThemeProvider({ children }: { children: React.ReactNode }) {
  return <TenantThemeContext.Provider value={{ brandColor: BRAND_COLOR }}>{children}</TenantThemeContext.Provider>;
}

export function useTenantTheme() {
  return useContext(TenantThemeContext);
}
