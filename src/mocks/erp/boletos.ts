export type Boleto = {
  id: string;
  number: string;
  customerName: string;
  dueDate: string;
  value: number;
  barcode: string;
  status: "pendente" | "pago" | "vencido" | "cancelado";
};

const BOLETOS: Boleto[] = [
  { id: "bol-01", number: "BOL-9021", customerName: "Indústria Ferraz Ltda", dueDate: "2026-08-20", value: 18500, barcode: "34191.79001 01043.510047 91020.150008 8 09680000018500", status: "pendente" },
  { id: "bol-02", number: "BOL-9018", customerName: "Comércio Aliança MB", dueDate: "2026-07-28", value: 9200, barcode: "34191.79001 01043.510047 91020.150008 8 09680000009200", status: "vencido" },
  { id: "bol-03", number: "BOL-9014", customerName: "Armazém Central Alimentos", dueDate: "2026-07-15", value: 14300, barcode: "34191.79001 01043.510047 91020.150008 8 09680000014300", status: "vencido" },
  { id: "bol-04", number: "BOL-9010", customerName: "Auto Peças Vitória", dueDate: "2026-08-30", value: 5890, barcode: "34191.79001 01043.510047 91020.150008 8 09680000005890", status: "pendente" },
  { id: "bol-05", number: "BOL-9005", customerName: "Distribuidora Rio Sul", dueDate: "2026-08-05", value: 23400, barcode: "34191.79001 01043.510047 91020.150008 8 09680000023400", status: "pago" },
  { id: "bol-06", number: "BOL-8998", customerName: "Papelaria Escreva Bem", dueDate: "2026-07-22", value: 3460, barcode: "34191.79001 01043.510047 91020.150008 8 09680000003460", status: "cancelado" },
];

export function getMockBoletos(): Boleto[] {
  return BOLETOS;
}

export function getMockBoletoById(id: string): Boleto | undefined {
  return BOLETOS.find((b) => b.id === id);
}
