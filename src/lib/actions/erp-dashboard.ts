"use server";

import { getErpPropostas } from "@/lib/actions/erp-propostas";

/**
 * KPIs reais do Dashboard do ERP, derivados de erp_propostas (a única fonte
 * de vendas real que o ERP tem hoje — Financeiro e Ordens de Produção
 * continuam mock, ver src/mocks/erp/dashboard.ts, então não entram aqui).
 * Antes disso o Dashboard inteiro era estático (getMockDashboardKpis) e todo
 * tenant novo via os mesmos R$697K/128 vendas de mentira desde o 1º acesso.
 */

const WON_STATUS = "aprovada";
const LOST_STATUSES = new Set(["recusada", "expirada", "cancelada"]);
// Qualquer status que não seja won nem lost conta como "em negociação"
// (rascunho, enviada, visualizada, negociacao).

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export type ErpDashboardData = {
  kpis: {
    revenue: number;
    sales: number;
    openQuotes: number;
  };
  revenueSeries: { month: string; faturamento: number }[];
  salesByStatus: { label: string; value: number }[];
};

function propostaTotalReais(p: {
  freight_cents: number;
  discount_cents: number;
  itens: { unit_price_cents: number; quantity: number; discount_pct: number }[];
}): number {
  const subtotalCents = p.itens.reduce(
    (sum, i) => sum + i.unit_price_cents * i.quantity * (1 - i.discount_pct / 100),
    0,
  );
  return (subtotalCents + p.freight_cents - p.discount_cents) / 100;
}

export async function getErpDashboardData(): Promise<ErpDashboardData> {
  const propostas = await getErpPropostas();

  // Últimos 12 meses, mais antigo primeiro — mesmo desenho do mock que
  // substitui, só que zerado até ter proposta aprovada de verdade no mês.
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, month: MONTH_LABELS[d.getMonth()], faturamento: 0 };
  });
  const monthIndexByKey = new Map(months.map((m, idx) => [m.key, idx]));

  let revenue = 0;
  let won = 0;
  let open = 0;
  let lost = 0;

  for (const p of propostas) {
    if (p.status === WON_STATUS) {
      won++;
      const total = propostaTotalReais(p);
      revenue += total;
      const created = new Date(p.created_at);
      const idx = monthIndexByKey.get(`${created.getFullYear()}-${created.getMonth()}`);
      if (idx !== undefined) months[idx].faturamento += total;
    } else if (LOST_STATUSES.has(p.status)) {
      lost++;
    } else {
      open++;
    }
  }

  return {
    kpis: { revenue, sales: won, openQuotes: open },
    revenueSeries: months.map(({ month, faturamento }) => ({ month, faturamento })),
    salesByStatus: [
      { label: "Ganhas", value: won },
      { label: "Em negociação", value: open },
      { label: "Perdidas", value: lost },
    ],
  };
}
