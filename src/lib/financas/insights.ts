import type { FinancasLancamento } from "@/types/domain";

export type SavingsTip = {
  category: string;
  currentTotal: number;
  averageTotal: number;
  message: string;
};

/**
 * Regra simples, sem IA: compara o gasto do mês atual em cada categoria com
 * a média dos 3 meses anteriores na mesma categoria. Aponta a categoria que
 * mais cresceu em R$ acima de um piso mínimo — isso evita "dica" sobre
 * ruído (uma compra única de R$ 20 a mais não vira dica).
 */
export function computeSavingsTip(
  lancamentos: FinancasLancamento[],
  year: number,
  month: number,
): SavingsTip | null {
  const currentKey = `${year}-${month}`;
  const priorKeys = new Set<string>();
  for (let i = 1; i <= 3; i++) {
    const d = new Date(year, month - 1 - i, 1);
    priorKeys.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
  }

  const currentByCategory = new Map<string, number>();
  const priorByCategory = new Map<string, number>();

  for (const l of lancamentos) {
    if (l.type !== "despesa") continue;
    const d = new Date(l.entry_date + "T00:00:00");
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const value = l.amount_cents / 100;

    if (key === currentKey) {
      currentByCategory.set(l.category, (currentByCategory.get(l.category) ?? 0) + value);
    } else if (priorKeys.has(key)) {
      priorByCategory.set(l.category, (priorByCategory.get(l.category) ?? 0) + value);
    }
  }

  let best: SavingsTip | null = null;
  for (const [category, currentTotal] of currentByCategory) {
    const averageTotal = (priorByCategory.get(category) ?? 0) / 3;
    const diff = currentTotal - averageTotal;
    if (diff < 80) continue; // ignora variações pequenas, não é "dica" de verdade
    if (!best || diff > best.currentTotal - best.averageTotal) {
      best = {
        category,
        currentTotal,
        averageTotal,
        message:
          averageTotal > 0
            ? `Você gastou ${formatDiffPct(currentTotal, averageTotal)} a mais em "${category}" este mês, comparado à sua média dos últimos 3 meses.`
            : `"${category}" é uma categoria nova de gasto este mês — vale acompanhar se ela vai virar hábito.`,
      };
    }
  }

  return best;
}

function formatDiffPct(current: number, average: number): string {
  const pct = Math.round(((current - average) / average) * 100);
  return `${pct}%`;
}
