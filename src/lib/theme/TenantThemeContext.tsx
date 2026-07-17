"use client";

import { createContext, useContext } from "react";

const DEFAULT_BRAND_COLOR = "#4f46e5";

export const FONT_OPTIONS = {
  default: { label: "Padrão", stack: "Arial, Helvetica, sans-serif" },
  modern: { label: "Moderna", stack: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  classic: { label: "Clássica", stack: "Georgia, 'Times New Roman', serif" },
  rounded: { label: "Arredondada", stack: "Verdana, Tahoma, sans-serif" },
} as const;

export type FontKey = keyof typeof FONT_OPTIONS;

export const TEXT_SIZE_OPTIONS = {
  small: { label: "Pequeno", rootPx: 14 },
  medium: { label: "Médio", rootPx: 16 },
  large: { label: "Grande", rootPx: 18 },
} as const;

export type TextSizeKey = keyof typeof TEXT_SIZE_OPTIONS;

function isFontKey(value: string): value is FontKey {
  return value in FONT_OPTIONS;
}

const TenantThemeContext = createContext<{ brandColor: string }>({
  brandColor: DEFAULT_BRAND_COLOR,
});

export function TenantThemeProvider({
  brandColor,
  brandFont,
  textSize,
  children,
}: {
  brandColor: string;
  brandFont?: string | null;
  textSize?: TextSizeKey;
  children: React.ReactNode;
}) {
  const fontKey = brandFont && isFontKey(brandFont) ? brandFont : "default";
  const sizeKey = textSize ?? "medium";

  return (
    <TenantThemeContext.Provider value={{ brandColor: brandColor || DEFAULT_BRAND_COLOR }}>
      <style>{`
        html { font-size: ${TEXT_SIZE_OPTIONS[sizeKey].rootPx}px; }
        body { font-family: ${FONT_OPTIONS[fontKey].stack}; }
      `}</style>
      {children}
    </TenantThemeContext.Provider>
  );
}

export function useTenantTheme() {
  return useContext(TenantThemeContext);
}
