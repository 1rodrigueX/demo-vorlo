export type Sale = {
  id: string;
  number: string;
  customerName: string;
  sellerName: string;
  quoteNumber: string | null;
  date: string;
  value: number;
  paymentTerm: string;
  status: "pendente" | "processando" | "faturado" | "entregue" | "cancelado";
};

const SALES: Sale[] = [
  { id: "vnd-1042", number: "VND-1042", customerName: "Indústria Ferraz Ltda", sellerName: "Carlos Meneses", quoteNumber: "PROP-1042", date: "2026-08-02", value: 18500, paymentTerm: "30/60/90 dias", status: "faturado" },
  { id: "vnd-1039", number: "VND-1039", customerName: "Comércio Aliança MB", sellerName: "Renata Souza Lima", quoteNumber: null, date: "2026-07-26", value: 9200, paymentTerm: "À vista", status: "entregue" },
  { id: "vnd-1035", number: "VND-1035", customerName: "Distribuidora Rio Sul", sellerName: "João Pedro Alencar", quoteNumber: null, date: "2026-07-20", value: 23400, paymentTerm: "45 dias", status: "entregue" },
  { id: "vnd-1030", number: "VND-1030", customerName: "Metalúrgica Bragança", sellerName: "Fernanda Cardoso", quoteNumber: null, date: "2026-08-06", value: 6700, paymentTerm: "30 dias", status: "processando" },
  { id: "vnd-1028", number: "VND-1028", customerName: "Armazém Central Alimentos", sellerName: "Carlos Meneses", quoteNumber: null, date: "2026-07-10", value: 14300, paymentTerm: "À vista", status: "entregue" },
  { id: "vnd-1025", number: "VND-1025", customerName: "Auto Peças Vitória", sellerName: "João Pedro Alencar", quoteNumber: null, date: "2026-08-09", value: 5890, paymentTerm: "30 dias", status: "pendente" },
  { id: "vnd-1020", number: "VND-1020", customerName: "Têxtil Nordeste S.A.", sellerName: "Renata Souza Lima", quoteNumber: null, date: "2026-08-04", value: 20100, paymentTerm: "45 dias", status: "faturado" },
  { id: "vnd-1018", number: "VND-1018", customerName: "Papelaria Escreva Bem", sellerName: "Marcos Vinícius Prado", quoteNumber: null, date: "2026-07-16", value: 3460, paymentTerm: "30 dias", status: "cancelado" },
  { id: "vnd-1012", number: "VND-1012", customerName: "Móveis Planejados Vitral", sellerName: "Fernanda Cardoso", quoteNumber: null, date: "2026-07-28", value: 11980, paymentTerm: "À vista", status: "entregue" },
  { id: "vnd-1009", number: "VND-1009", customerName: "Grupo Eletro Salvador", sellerName: "Bianca Ferreira Reis", quoteNumber: null, date: "2026-07-13", value: 17640, paymentTerm: "60 dias", status: "entregue" },
];

export function getMockSales(): Sale[] {
  return SALES;
}

export function getMockSaleById(id: string): Sale | undefined {
  return SALES.find((s) => s.id === id);
}
