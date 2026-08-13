export type PurchaseOrderStatus = "pendente" | "aprovado" | "recebido" | "cancelado";

export type PurchaseOrder = {
  id: string;
  number: string;
  supplierName: string;
  date: string;
  expectedDate: string;
  itemsCount: number;
  value: number;
  status: PurchaseOrderStatus;
};

const PURCHASE_ORDERS: PurchaseOrder[] = [
  { id: "pc-224", number: "PC-224", supplierName: "Aço Brasil Distribuidora", date: "2026-08-10", expectedDate: "2026-08-19", itemsCount: 4, value: 15200, status: "pendente" },
  { id: "pc-223", number: "PC-223", supplierName: "Química Industrial Atlas", date: "2026-08-08", expectedDate: "2026-08-16", itemsCount: 2, value: 3780, status: "aprovado" },
  { id: "pc-222", number: "PC-222", supplierName: "Componentes Eletrônicos JB", date: "2026-08-05", expectedDate: "2026-08-13", itemsCount: 6, value: 4150, status: "aprovado" },
  { id: "pc-220", number: "PC-220", supplierName: "Aço Brasil Distribuidora", date: "2026-07-30", expectedDate: "2026-08-08", itemsCount: 3, value: 12400, status: "recebido" },
  { id: "pc-218", number: "PC-218", supplierName: "Polímeros Sul Indústria", date: "2026-07-24", expectedDate: "2026-08-01", itemsCount: 5, value: 8900, status: "recebido" },
  { id: "pc-215", number: "PC-215", supplierName: "Embalagens Rio Grande", date: "2026-07-18", expectedDate: "2026-07-25", itemsCount: 8, value: 5300, status: "recebido" },
  { id: "pc-212", number: "PC-212", supplierName: "Ferramentaria Precision", date: "2026-07-12", expectedDate: "2026-07-22", itemsCount: 1, value: 6200, status: "cancelado" },
  { id: "pc-210", number: "PC-210", supplierName: "Química Industrial Atlas", date: "2026-07-05", expectedDate: "2026-07-15", itemsCount: 3, value: 3780, status: "recebido" },
];

export function getMockPurchaseOrders(): PurchaseOrder[] {
  return PURCHASE_ORDERS;
}

export function getMockPurchaseOrderById(id: string): PurchaseOrder | undefined {
  return PURCHASE_ORDERS.find((p) => p.id === id);
}
