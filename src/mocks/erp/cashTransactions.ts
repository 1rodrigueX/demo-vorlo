export type CashTransaction = {
  id: string;
  date: string;
  description: string;
  category: string;
  type: "entrada" | "saida";
  value: number;
};

const CASH_TRANSACTIONS: CashTransaction[] = [
  { id: "cx-01", date: "2026-08-13", description: "Recebimento venda VND-1035", category: "Vendas", type: "entrada", value: 23400 },
  { id: "cx-02", date: "2026-08-12", description: "Pagamento fornecedor Embalagens Rio Grande", category: "Fornecedores", type: "saida", value: 5300 },
  { id: "cx-03", date: "2026-08-11", description: "Recebimento venda VND-1020", category: "Vendas", type: "entrada", value: 20100 },
  { id: "cx-04", date: "2026-08-10", description: "Pagamento de energia elétrica", category: "Utilidades", type: "saida", value: 3420 },
  { id: "cx-05", date: "2026-08-08", description: "Recebimento venda VND-1028", category: "Vendas", type: "entrada", value: 14300 },
  { id: "cx-06", date: "2026-08-06", description: "Folha de pagamento — quinzena", category: "Pessoal", type: "saida", value: 38600 },
  { id: "cx-07", date: "2026-08-05", description: "Pagamento Aço Brasil Distribuidora", category: "Fornecedores", type: "saida", value: 12400 },
  { id: "cx-08", date: "2026-08-03", description: "Recebimento venda VND-1012", category: "Vendas", type: "entrada", value: 11980 },
  { id: "cx-09", date: "2026-08-02", description: "Manutenção de maquinário", category: "Manutenção", type: "saida", value: 4150 },
  { id: "cx-10", date: "2026-08-01", description: "Recebimento venda VND-1009", category: "Vendas", type: "entrada", value: 17640 },
];

export function getMockCashTransactions(): CashTransaction[] {
  return CASH_TRANSACTIONS;
}
