// Gerador de transações simuladas pro modo "mock" da conexão bancária —
// sem nenhum agregador Open Finance real plugado ainda. Serve pra construir
// e testar a experiência completa (extrato importado, gasto de cartão, dica
// de economia) usando as categorias reais do tenant, sem inventar nomes que
// não existem na lista dele.

export type MockTransaction = {
  type: "receita" | "despesa";
  category: string;
  description: string;
  amount_cents: number;
  entry_date: string;
  payment_method: "pix" | "boleto" | "cartao_credito" | "debito";
  external_id: string;
};

const DESPESA_LABELS: Record<string, string[]> = {
  Moradia: ["Aluguel", "Condomínio", "Conta de luz", "Conta de água", "Internet"],
  Subsistência: ["Supermercado", "Feira", "Padaria"],
  Transporte: ["Uber", "Combustível", "Estacionamento", "Passagem"],
  Saúde: ["Farmácia", "Plano de saúde", "Consulta"],
  Lazer: ["Netflix", "Spotify", "Cinema", "Restaurante"],
  Vestuário: ["Loja de roupas", "Calçados"],
};

function labelFor(category: string): string {
  const options = DESPESA_LABELS[category];
  if (!options) return category;
  return options[Math.floor(Math.random() * options.length)];
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function randomAmountCents(minReais: number, maxReais: number): number {
  return Math.round((minReais + Math.random() * (maxReais - minReais)) * 100);
}

/** Histórico de ~3 meses pra popular a conexão na primeira sincronização. */
export function generateMockHistory(
  despesaCategorias: { name: string }[],
  receitaCategorias: { name: string }[],
  referenceDate = new Date(),
): MockTransaction[] {
  if (despesaCategorias.length === 0) return [];
  const transactions: MockTransaction[] = [];
  const salario = receitaCategorias.find((c) => /sal[aá]rio/i.test(c.name)) ?? receitaCategorias[0];

  for (let monthOffset = 2; monthOffset >= 0; monthOffset--) {
    const monthDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - monthOffset, 1);

    if (salario) {
      const payday = new Date(monthDate.getFullYear(), monthDate.getMonth(), 5);
      transactions.push({
        type: "receita",
        category: salario.name,
        description: "Salário",
        amount_cents: randomAmountCents(4200, 5200),
        entry_date: toDateStr(payday),
        payment_method: "pix",
        external_id: `mock-hist-${monthOffset}-salario`,
      });
    }

    const despesasNoMes = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < despesasNoMes; i++) {
      const cat = despesaCategorias[Math.floor(Math.random() * despesaCategorias.length)];
      const day = 1 + Math.floor(Math.random() * 27);
      const isCartao = Math.random() < 0.45;
      transactions.push({
        type: "despesa",
        category: cat.name,
        description: labelFor(cat.name),
        amount_cents: isCartao ? randomAmountCents(40, 350) : randomAmountCents(15, 200),
        entry_date: toDateStr(new Date(monthDate.getFullYear(), monthDate.getMonth(), day)),
        payment_method: isCartao ? "cartao_credito" : (["pix", "debito", "boleto"] as const)[i % 3],
        external_id: `mock-hist-${monthOffset}-${i}`,
      });
    }
  }

  return transactions;
}

/** Lote pequeno de transações "novas" — simula uma sincronização de verdade trazendo movimentação recente. */
export function generateMockSyncBatch(despesaCategorias: { name: string }[]): MockTransaction[] {
  if (despesaCategorias.length === 0) return [];
  const now = Date.now();
  const count = 2 + Math.floor(Math.random() * 3);
  const transactions: MockTransaction[] = [];

  for (let i = 0; i < count; i++) {
    const cat = despesaCategorias[Math.floor(Math.random() * despesaCategorias.length)];
    const daysAgo = Math.floor(Math.random() * 3);
    const isCartao = Math.random() < 0.45;
    transactions.push({
      type: "despesa",
      category: cat.name,
      description: labelFor(cat.name),
      amount_cents: isCartao ? randomAmountCents(40, 350) : randomAmountCents(15, 200),
      entry_date: toDateStr(new Date(Date.now() - daysAgo * 86_400_000)),
      payment_method: isCartao ? "cartao_credito" : "pix",
      external_id: `mock-sync-${now}-${i}`,
    });
  }

  return transactions;
}
