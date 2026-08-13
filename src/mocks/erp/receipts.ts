export type ReceiptStatus = "conferencia" | "concluido" | "divergente";

export type Receipt = {
  id: string;
  number: string;
  purchaseOrderNumber: string;
  supplierName: string;
  receivedDate: string;
  itemsCount: number;
  status: ReceiptStatus;
};

const RECEIPTS: Receipt[] = [
  { id: "rcb-118", number: "RCB-118", purchaseOrderNumber: "PC-220", supplierName: "Aço Brasil Distribuidora", receivedDate: "2026-08-08", itemsCount: 3, status: "concluido" },
  { id: "rcb-117", number: "RCB-117", purchaseOrderNumber: "PC-218", supplierName: "Polímeros Sul Indústria", receivedDate: "2026-08-01", itemsCount: 5, status: "divergente" },
  { id: "rcb-116", number: "RCB-116", purchaseOrderNumber: "PC-215", supplierName: "Embalagens Rio Grande", receivedDate: "2026-07-25", itemsCount: 8, status: "concluido" },
  { id: "rcb-115", number: "RCB-115", purchaseOrderNumber: "PC-210", supplierName: "Química Industrial Atlas", receivedDate: "2026-07-15", itemsCount: 3, status: "concluido" },
  { id: "rcb-114", number: "RCB-114", purchaseOrderNumber: "PC-222", supplierName: "Componentes Eletrônicos JB", receivedDate: "2026-08-12", itemsCount: 6, status: "conferencia" },
  { id: "rcb-113", number: "RCB-113", purchaseOrderNumber: "PC-223", supplierName: "Química Industrial Atlas", receivedDate: "2026-08-13", itemsCount: 2, status: "conferencia" },
];

export function getMockReceipts(): Receipt[] {
  return RECEIPTS;
}
