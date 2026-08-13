export type Payable = {
  id: string;
  supplierName: string;
  description: string;
  dueDate: string;
  value: number;
  paymentMethod: string;
  status: "pendente" | "pago" | "vencido" | "cancelado";
};

const PAYABLES: Payable[] = [
  { id: "pag-01", supplierName: "Aço Brasil Distribuidora", description: "Pedido de compra PC-220", dueDate: "2026-08-15", value: 12400, paymentMethod: "Boleto", status: "pendente" },
  { id: "pag-02", supplierName: "Polímeros Sul Indústria", description: "Pedido de compra PC-218", dueDate: "2026-08-01", value: 8900, paymentMethod: "Transferência", status: "vencido" },
  { id: "pag-03", supplierName: "Transportadora Veloz Cargo", description: "Frete NF 4521", dueDate: "2026-08-22", value: 2150, paymentMethod: "Boleto", status: "pendente" },
  { id: "pag-04", supplierName: "Embalagens Rio Grande", description: "Pedido de compra PC-215", dueDate: "2026-07-25", value: 5300, paymentMethod: "Boleto", status: "pago" },
  { id: "pag-05", supplierName: "Química Industrial Atlas", description: "Pedido de compra PC-210", dueDate: "2026-09-01", value: 3780, paymentMethod: "Boleto", status: "pendente" },
  { id: "pag-06", supplierName: "Ferramentaria Precision", description: "Manutenção de molde", dueDate: "2026-07-30", value: 6200, paymentMethod: "Transferência", status: "vencido" },
  { id: "pag-07", supplierName: "Componentes Eletrônicos JB", description: "Pedido de compra PC-205", dueDate: "2026-08-12", value: 4150, paymentMethod: "Boleto", status: "pendente" },
];

export function getMockPayables(): Payable[] {
  return PAYABLES;
}
