"use client";

import { createContext, useContext } from "react";

const DEFAULT_BRAND_COLOR = "#4f46e5";

const TenantThemeContext = createContext<{ brandColor: string }>({
  brandColor: DEFAULT_BRAND_COLOR,
});

export function TenantThemeProvider({
  brandColor,
  children,
}: {
  brandColor: string;
  children: React.ReactNode;
}) {
  return (
    <TenantThemeContext.Provider value={{ brandColor: brandColor || DEFAULT_BRAND_COLOR }}>
      {children}
    </TenantThemeContext.Provider>
  );
}

export function useTenantTheme() {
  return useContext(TenantThemeContext);
}
