export type PurchaseSuggestion = {
  id: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  suggestedQty: number;
  preferredSupplier: string;
  urgency: "baixa" | "media" | "alta";
};

const PURCHASE_SUGGESTIONS: PurchaseSuggestion[] = [
  { id: "sug-01", productName: "Chapa de aço 2mm 1000x2000mm", sku: "CHP-AC-2MM", currentStock: 8, minStock: 20, suggestedQty: 60, preferredSupplier: "Aço Brasil Distribuidora", urgency: "alta" },
  { id: "sug-02", productName: "Suporte de dobradiça reforçado", sku: "MNJ-DOB-01", currentStock: 0, minStock: 50, suggestedQty: 150, preferredSupplier: "Componentes Eletrônicos JB", urgency: "alta" },
  { id: "sug-03", productName: "Resina de poliuretano 500ml", sku: "RSN-PU-500", currentStock: 6, minStock: 12, suggestedQty: 40, preferredSupplier: "Polímeros Sul Indústria", urgency: "media" },
  { id: "sug-04", productName: "Tampão de borracha padrão M", sku: "TAM-BOR-M", currentStock: 5, minStock: 10, suggestedQty: 30, preferredSupplier: "Ferramentaria Precision", urgency: "media" },
  { id: "sug-05", productName: "Tinta epóxi azul RAL 5010", sku: "TNT-EPX-AZ", currentStock: 15, minStock: 10, suggestedQty: 20, preferredSupplier: "Química Industrial Atlas", urgency: "baixa" },
  { id: "sug-06", productName: "Filme PVC industrial 30cm", sku: "FLM-PVC-01", currentStock: 44, minStock: 15, suggestedQty: 25, preferredSupplier: "Embalagens Rio Grande", urgency: "baixa" },
];

export function getMockPurchaseSuggestions(): PurchaseSuggestion[] {
  return PURCHASE_SUGGESTIONS;
}
