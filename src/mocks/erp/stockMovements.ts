export type StockMovement = {
  id: string;
  date: string;
  productName: string;
  sku: string;
  type: "entrada" | "saida" | "ajuste";
  quantity: number;
  reason: string;
  warehouse: string;
  responsible: string;
};

const STOCK_MOVEMENTS: StockMovement[] = [
  { id: "mov-01", date: "2026-08-12", productName: "Perfil injetado padrão 40cm", sku: "PRF-INJ-STD", type: "entrada", quantity: 200, reason: "Recebimento PC-220", warehouse: "Depósito Central", responsible: "João Pedro Alencar" },
  { id: "mov-02", date: "2026-08-11", productName: "Caixa de papelão reforçada M", sku: "CX-PAP-M", type: "saida", quantity: 80, reason: "Expedição VND-1042", warehouse: "Depósito Embalagens", responsible: "Fernanda Cardoso" },
  { id: "mov-03", date: "2026-08-10", productName: "Chapa de aço 2mm 1000x2000mm", sku: "CHP-AC-2MM", type: "saida", quantity: 12, reason: "Consumo OP-3392", warehouse: "Depósito Central", responsible: "Marcos Vinícius Prado" },
  { id: "mov-04", date: "2026-08-09", productName: "Parafuso M8 inox sextavado", sku: "PAR-M8-INX", type: "ajuste", quantity: -5, reason: "Ajuste de inventário INV-014", warehouse: "Depósito Central", responsible: "Carlos Meneses" },
  { id: "mov-05", date: "2026-08-08", productName: "Tinta epóxi azul RAL 5010", sku: "TNT-EPX-AZ", type: "entrada", quantity: 10, reason: "Recebimento PC-210", warehouse: "Depósito Insumos", responsible: "Bianca Ferreira Reis" },
  { id: "mov-06", date: "2026-08-07", productName: "Etiqueta térmica 100x50mm", sku: "ETQ-TER-100", type: "saida", quantity: 60, reason: "Expedição VND-1039", warehouse: "Depósito Embalagens", responsible: "Fernanda Cardoso" },
  { id: "mov-07", date: "2026-08-05", productName: "Resina de poliuretano 500ml", sku: "RSN-PU-500", type: "saida", quantity: 6, reason: "Consumo OP-3388", warehouse: "Depósito Insumos", responsible: "Marcos Vinícius Prado" },
  { id: "mov-08", date: "2026-08-04", productName: "Cabo elétrico flexível 2,5mm 2m", sku: "CBO-ELE-2M", type: "entrada", quantity: 40, reason: "Recebimento PC-205", warehouse: "Depósito Central", responsible: "João Pedro Alencar" },
  { id: "mov-09", date: "2026-08-02", productName: "Suporte de dobradiça reforçado", sku: "MNJ-DOB-01", type: "ajuste", quantity: -3, reason: "Perda identificada em conferência", warehouse: "Depósito Central", responsible: "Carlos Meneses" },
  { id: "mov-10", date: "2026-08-01", productName: "Filme PVC industrial 30cm", sku: "FLM-PVC-01", type: "entrada", quantity: 30, reason: "Recebimento PC-215", warehouse: "Depósito Embalagens", responsible: "Bianca Ferreira Reis" },
];

export function getMockStockMovements(): StockMovement[] {
  return STOCK_MOVEMENTS;
}
