export type StockItem = {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  reserved: number;
  minStock: number;
  warehouse: string;
  isRawMaterial: boolean;
  status: "normal" | "baixo" | "esgotado";
};

function computeStatus(quantity: number, minStock: number): StockItem["status"] {
  if (quantity <= 0) return "esgotado";
  if (quantity < minStock) return "baixo";
  return "normal";
}

const RAW: Omit<StockItem, "status">[] = [
  { id: "stk-01", productName: "Chapa de aço 2mm 1000x2000mm", sku: "CHP-AC-2MM", quantity: 8, reserved: 3, minStock: 20, warehouse: "Depósito Central", isRawMaterial: true },
  { id: "stk-02", productName: "Perfil injetado padrão 40cm", sku: "PRF-INJ-STD", quantity: 640, reserved: 120, minStock: 100, warehouse: "Depósito Central", isRawMaterial: false },
  { id: "stk-03", productName: "Parafuso M8 inox sextavado", sku: "PAR-M8-INX", quantity: 92, reserved: 10, minStock: 30, warehouse: "Depósito Central", isRawMaterial: false },
  { id: "stk-04", productName: "Tinta epóxi azul RAL 5010", sku: "TNT-EPX-AZ", quantity: 15, reserved: 4, minStock: 10, warehouse: "Depósito Insumos", isRawMaterial: true },
  { id: "stk-05", productName: "Caixa de papelão reforçada M", sku: "CX-PAP-M", quantity: 1240, reserved: 300, minStock: 200, warehouse: "Depósito Embalagens", isRawMaterial: false },
  { id: "stk-06", productName: "Suporte de dobradiça reforçado", sku: "MNJ-DOB-01", quantity: 0, reserved: 0, minStock: 50, warehouse: "Depósito Central", isRawMaterial: false },
  { id: "stk-07", productName: "Filme PVC industrial 30cm", sku: "FLM-PVC-01", quantity: 44, reserved: 12, minStock: 15, warehouse: "Depósito Embalagens", isRawMaterial: false },
  { id: "stk-08", productName: "Resina de poliuretano 500ml", sku: "RSN-PU-500", quantity: 6, reserved: 2, minStock: 12, warehouse: "Depósito Insumos", isRawMaterial: true },
  { id: "stk-09", productName: "Etiqueta térmica 100x50mm", sku: "ETQ-TER-100", quantity: 210, reserved: 40, minStock: 40, warehouse: "Depósito Embalagens", isRawMaterial: false },
  { id: "stk-10", productName: "Cabo elétrico flexível 2,5mm 2m", sku: "CBO-ELE-2M", quantity: 88, reserved: 15, minStock: 25, warehouse: "Depósito Central", isRawMaterial: false },
  { id: "stk-11", productName: "Tampão de borracha padrão M", sku: "TAM-BOR-M", quantity: 5, reserved: 0, minStock: 10, warehouse: "Depósito Central", isRawMaterial: false },
];

const STOCK: StockItem[] = RAW.map((r) => ({ ...r, status: computeStatus(r.quantity, r.minStock) }));

export function getMockStock(): StockItem[] {
  return STOCK;
}
