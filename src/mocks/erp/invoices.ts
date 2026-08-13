export type Invoice = {
  id: string;
  number: string;
  series: string;
  customerName: string;
  value: number;
  issueDate: string;
  status: "processando" | "autorizada" | "rejeitada" | "cancelada";
};

const INVOICES: Invoice[] = [
  { id: "nfe-4531", number: "4531", series: "1", customerName: "Indústria Ferraz Ltda", value: 18500, issueDate: "2026-08-12", status: "autorizada" },
  { id: "nfe-4530", number: "4530", series: "1", customerName: "Comércio Aliança MB", value: 9200, issueDate: "2026-08-11", status: "autorizada" },
  { id: "nfe-4529", number: "4529", series: "1", customerName: "Distribuidora Rio Sul", value: 23400, issueDate: "2026-08-10", status: "autorizada" },
  { id: "nfe-4528", number: "4528", series: "1", customerName: "Metalúrgica Bragança", value: 6700, issueDate: "2026-08-09", status: "processando" },
  { id: "nfe-4527", number: "4527", series: "1", customerName: "Armazém Central Alimentos", value: 14300, issueDate: "2026-08-06", status: "autorizada" },
  { id: "nfe-4526", number: "4526", series: "1", customerName: "Auto Peças Vitória", value: 5890, issueDate: "2026-08-05", status: "rejeitada" },
  { id: "nfe-4525", number: "4525", series: "1", customerName: "Têxtil Nordeste S.A.", value: 20100, issueDate: "2026-08-04", status: "autorizada" },
  { id: "nfe-4524", number: "4524", series: "1", customerName: "Papelaria Escreva Bem", value: 3460, issueDate: "2026-07-30", status: "cancelada" },
  { id: "nfe-4523", number: "4523", series: "1", customerName: "Móveis Planejados Vitral", value: 11980, issueDate: "2026-07-28", status: "autorizada" },
  { id: "nfe-4522", number: "4522", series: "1", customerName: "Grupo Eletro Salvador", value: 17640, issueDate: "2026-07-26", status: "autorizada" },
];

export function getMockInvoices(): Invoice[] {
  return INVOICES;
}

export function getMockInvoiceById(id: string): Invoice | undefined {
  return INVOICES.find((i) => i.id === id);
}
