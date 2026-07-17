export type PeriodPreset = "today" | "week" | "month" | "custom";

export function resolvePeriod(
  preset: PeriodPreset,
  customFrom?: string,
  customTo?: string,
): { from: Date; to: Date } {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  if (preset === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start, to: endOfToday };
  }

  if (preset === "week") {
    const start = new Date(now);
    const day = (start.getDay() + 6) % 7; // segunda = início da semana
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return { from: start, to: endOfToday };
  }

  if (preset === "custom" && customFrom) {
    const from = new Date(`${customFrom}T00:00:00`);
    const to = customTo ? new Date(`${customTo}T23:59:59`) : endOfToday;
    return { from, to };
  }

  // "month" (padrão)
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: start, to: endOfToday };
}
