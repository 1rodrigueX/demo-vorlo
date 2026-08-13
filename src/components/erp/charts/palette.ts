/**
 * Paleta dos gráficos do ERP — segue a skill `dataviz` (paleta de referência
 * validada: `node scripts/validate_palette.js` passou pros 3 slots usados
 * aqui, claro e escuro). Categórica em ORDEM FIXA (nunca reordenada pelos
 * dados) — slot 1 sempre a mesma cor em qualquer gráfico.
 */

export const CATEGORICAL_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"] as const;
export const CATEGORICAL_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"] as const;

/** Rampa sequencial (magnitude, uma série) — azul, do claro pro escuro. */
export const SEQUENTIAL_BLUE = { light: "#2a78d6", dark: "#3987e5" } as const;
export const SEQUENTIAL_BLUE_FILL = { light: "#9ec5f4", dark: "#1c5cab" } as const;

export const CHART_CHROME = {
  light: { grid: "#e1e0d9", axis: "#c3c2b7", mutedText: "#898781", tooltipBg: "#ffffff", tooltipBorder: "#e1e0d9" },
  dark: { grid: "#2c2c2a", axis: "#383835", mutedText: "#898781", tooltipBg: "#121826", tooltipBorder: "#2c2c2a" },
} as const;

export function categoricalPalette(isDark: boolean): readonly string[] {
  return isDark ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
}
