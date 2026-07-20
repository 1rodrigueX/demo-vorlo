// Paleta categórica validada (dataviz skill) — ordem fixa, nunca ciclada. 8
// slots disponíveis, usamos 6 pras categorias de despesa + 2 pras de receita.
export const CHART_COLORS = {
  blue: "#3987e5",
  green: "#008300",
  magenta: "#d55181",
  yellow: "#c98500",
  aqua: "#199e70",
  orange: "#d95926",
  violet: "#9085e9",
  red: "#e66767",
} as const;

export const EXPENSE_CATEGORIES = [
  { value: "Moradia", color: CHART_COLORS.blue },
  { value: "Subsistência", color: CHART_COLORS.green },
  { value: "Transporte", color: CHART_COLORS.magenta },
  { value: "Saúde", color: CHART_COLORS.yellow },
  { value: "Lazer", color: CHART_COLORS.aqua },
  { value: "Vestuário", color: CHART_COLORS.orange },
] as const;

export const INCOME_CATEGORIES = [
  { value: "Salário", color: CHART_COLORS.blue },
  { value: "Outras Receitas", color: CHART_COLORS.magenta },
] as const;

export function colorForExpenseCategory(category: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === category)?.color ?? CHART_COLORS.violet;
}

export const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez",
] as const;

export const MONTH_LABELS_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;
