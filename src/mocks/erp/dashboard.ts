export type DashboardKpis = {
  revenue: number;
  sales: number;
  openQuotes: number;
  productionOrders: number;
  receivable: number;
  overdue: number;
};

export function getMockDashboardKpis(): DashboardKpis {
  return {
    revenue: 697707.93,
    sales: 128,
    openQuotes: 103,
    productionOrders: 24,
    receivable: 183500,
    overdue: 41200,
  };
}

export type RevenuePoint = { month: string; faturamento: number };

export function getMockRevenueSeries(): RevenuePoint[] {
  return [
    { month: "Fev", faturamento: 412300 },
    { month: "Mar", faturamento: 458900 },
    { month: "Abr", faturamento: 401200 },
    { month: "Mai", faturamento: 489700 },
    { month: "Jun", faturamento: 512400 },
    { month: "Jul", faturamento: 548900 },
    { month: "Ago", faturamento: 531200 },
    { month: "Set", faturamento: 587600 },
    { month: "Out", faturamento: 612300 },
    { month: "Nov", faturamento: 634800 },
    { month: "Dez", faturamento: 658100 },
    { month: "Jan", faturamento: 697707.93 },
  ];
}

export function getMockSalesByStatus(): { label: string; value: number }[] {
  return [
    { label: "Ganhas", value: 128 },
    { label: "Em negociação", value: 47 },
    { label: "Perdidas", value: 21 },
  ];
}

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
