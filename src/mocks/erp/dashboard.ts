// getMockDashboardKpis/getMockRevenueSeries/getMockSalesByStatus saíram
// daqui — o Dashboard geral do ERP (src/app/[tenantSlug]/erp/page.tsx) usa
// dado real de erp_propostas agora (ver src/lib/actions/erp-dashboard.ts).
// O que sobrou aqui ainda alimenta Financeiro e Produção, que continuam
// mock (nenhuma tabela própria no ERP pra isso ainda).

export type FinancePoint = { month: string; entradas: number; saidas: number };

export function getMockFinanceInOutSeries(): FinancePoint[] {
  return [
    { month: "Ago", entradas: 531200, saidas: 398400 },
    { month: "Set", entradas: 587600, saidas: 421900 },
    { month: "Out", entradas: 612300, saidas: 456200 },
    { month: "Nov", entradas: 634800, saidas: 468700 },
    { month: "Dez", entradas: 658100, saidas: 502300 },
    { month: "Jan", entradas: 697707.93, saidas: 519600 },
  ];
}

export type ProductionSummary = { planned: number; inProgress: number; late: number; completed: number };

export function getMockProductionSummary(): ProductionSummary {
  return { planned: 6, inProgress: 9, late: 3, completed: 6 };
}
