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

/** Valores de --radius-lg/xl/2xl do Tailwind (em rem) por preset — sobrescreve os tokens globais, então toda classe rounded-lg/xl/2xl já existente muda junto, sem editar componente por componente. */
export const BORDER_RADIUS_OPTIONS = {
  square: { label: "Quadrado", lg: "0rem", xl: "0rem", xxl: "0rem" },
  default: { label: "Padrão", lg: "0.5rem", xl: "0.75rem", xxl: "1rem" },
  rounded: { label: "Arredondado", lg: "0.75rem", xl: "1rem", xxl: "1.25rem" },
  pill: { label: "Muito arredondado", lg: "1rem", xl: "1.5rem", xxl: "2rem" },
} as const;

export type BorderRadiusKey = keyof typeof BORDER_RADIUS_OPTIONS;

function isFontKey(value: string): value is FontKey {
  return value in FONT_OPTIONS;
}

function isBorderRadiusKey(value: string): value is BorderRadiusKey {
  return value in BORDER_RADIUS_OPTIONS;
}

/** Converte #RRGGBB pra "r, g, b" — usado pra montar rgba() com opacidade baixa (hover). */
function hexToRgbParts(hex: string): string {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) return "79, 70, 229"; // fallback = DEFAULT_BRAND_COLOR em rgb
  const value = match[1];
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

const TenantThemeContext = createContext<{ brandColor: string }>({
  brandColor: DEFAULT_BRAND_COLOR,
});

export function TenantThemeProvider({
  brandColor,
  brandFont,
  textSize,
  borderRadius,
  backgroundColor,
  textColor,
  children,
}: {
  brandColor: string;
  brandFont?: string | null;
  textSize?: TextSizeKey;
  borderRadius?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  children: React.ReactNode;
}) {
  const resolvedBrandColor = brandColor || DEFAULT_BRAND_COLOR;
  const fontKey = brandFont && isFontKey(brandFont) ? brandFont : "default";
  const sizeKey = textSize ?? "medium";
  const radiusKey = borderRadius && isBorderRadiusKey(borderRadius) ? borderRadius : "default";
  const radius = BORDER_RADIUS_OPTIONS[radiusKey];

  return (
    <TenantThemeContext.Provider value={{ brandColor: resolvedBrandColor }}>
      <style>{`
        html { font-size: ${TEXT_SIZE_OPTIONS[sizeKey].rootPx}px; }
        body { font-family: ${FONT_OPTIONS[fontKey].stack}; }
        :root {
          --radius-lg: ${radius.lg};
          --radius-xl: ${radius.xl};
          --radius-2xl: ${radius.xxl};
          --sidebar-hover: rgba(${hexToRgbParts(resolvedBrandColor)}, 0.15);
          ${backgroundColor ? `--background: ${backgroundColor}; --color-gray-50: ${backgroundColor}; --color-panel: ${backgroundColor};` : ""}
          ${textColor ? `--foreground: ${textColor}; --color-gray-900: ${textColor};` : ""}
        }
      `}</style>
      {children}
    </TenantThemeContext.Provider>
  );
}

export function useTenantTheme() {
  return useContext(TenantThemeContext);
}
