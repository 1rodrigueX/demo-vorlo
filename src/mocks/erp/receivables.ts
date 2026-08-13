export type Receivable = {
  id: string;
  customerName: string;
  description: string;
  dueDate: string;
  value: number;
  paymentMethod: string;
  status: "pendente" | "pago" | "vencido" | "cancelado";
};

const RECEIVABLES: Receivable[] = [
  { id: "rec-01", customerName: "Indústria Ferraz Ltda", description: "Venda VND-1042", dueDate: "2026-08-20", value: 18500, paymentMethod: "Boleto", status: "pendente" },
  { id: "rec-02", customerName: "Comércio Aliança MB", description: "Venda VND-1039", dueDate: "2026-07-28", value: 9200, paymentMethod: "Boleto", status: "vencido" },
  { id: "rec-03", customerName: "Distribuidora Rio Sul", description: "Venda VND-1035", dueDate: "2026-08-05", value: 23400, paymentMethod: "Transferência", status: "pago" },
  { id: "rec-04", customerName: "Metalúrgica Bragança", description: "Venda VND-1030", dueDate: "2026-08-25", value: 6700, paymentMethod: "Cartão", status: "pendente" },
  { id: "rec-05", customerName: "Armazém Central Alimentos", description: "Venda VND-1028", dueDate: "2026-07-15", value: 14300, paymentMethod: "Boleto", status: "vencido" },
  { id: "rec-06", customerName: "Auto Peças Vitória", description: "Venda VND-1025", dueDate: "2026-08-30", value: 5890, paymentMethod: "Boleto", status: "pendente" },
  { id: "rec-07", customerName: "Têxtil Nordeste S.A.", description: "Venda VND-1020", dueDate: "2026-08-10", value: 20100, paymentMethod: "Transferência", status: "pago" },
  { id: "rec-08", customerName: "Papelaria Escreva Bem", description: "Venda VND-1018", dueDate: "2026-07-22", value: 3460, paymentMethod: "Boleto", status: "vencido" },
  { id: "rec-09", customerName: "Móveis Planejados Vitral", description: "Venda VND-1012", dueDate: "2026-09-02", value: 11980, paymentMethod: "Boleto", status: "pendente" },
  { id: "rec-10", customerName: "Grupo Eletro Salvador", description: "Venda VND-1009", dueDate: "2026-08-18", value: 17640, paymentMethod: "Cartão", status: "pendente" },
];

export function getMockReceivables(): Receivable[] {
  return RECEIVABLES;
}
