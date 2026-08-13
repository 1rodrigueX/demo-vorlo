export type StockInventoryCount = {
  id: string;
  code: string;
  warehouse: string;
  date: string;
  itemsCounted: number;
  divergences: number;
  responsible: string;
  status: "planejado" | "em_andamento" | "concluido";
};

const INVENTORY_COUNTS: StockInventoryCount[] = [
  { id: "inv-014", code: "INV-014", warehouse: "Depósito Central", date: "2026-08-09", itemsCounted: 128, divergences: 3, responsible: "Carlos Meneses", status: "concluido" },
  { id: "inv-013", code: "INV-013", warehouse: "Depósito Insumos", date: "2026-07-28", itemsCounted: 46, divergences: 0, responsible: "Bianca Ferreira Reis", status: "concluido" },
  { id: "inv-012", code: "INV-012", warehouse: "Depósito Embalagens", date: "2026-08-13", itemsCounted: 54, divergences: 2, responsible: "Fernanda Cardoso", status: "em_andamento" },
  { id: "inv-011", code: "INV-011", warehouse: "Depósito Central", date: "2026-07-14", itemsCounted: 132, divergences: 5, responsible: "Carlos Meneses", status: "concluido" },
  { id: "inv-010", code: "INV-010", warehouse: "Depósito Insumos", date: "2026-08-20", itemsCounted: 0, divergences: 0, responsible: "Marcos Vinícius Prado", status: "planejado" },
];

export function getMockStockInventoryCounts(): StockInventoryCount[] {
  return INVENTORY_COUNTS;
}
