export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  status: "ativo" | "inativo";
};

const PRODUCTS: Product[] = [
  { id: "prod-01", sku: "CHP-AC-2MM", name: "Chapa de aço 2mm 1000x2000mm", category: "Matéria-prima", unit: "UN", costPrice: 210, salePrice: 289, stock: 8, minStock: 20, status: "ativo" },
  { id: "prod-02", sku: "PRF-INJ-STD", name: "Perfil injetado padrão 40cm", category: "Componentes", unit: "UN", costPrice: 12.5, salePrice: 24.9, stock: 640, minStock: 100, status: "ativo" },
  { id: "prod-03", sku: "PAR-M8-INX", name: "Parafuso M8 inox sextavado", category: "Ferragens", unit: "CX", costPrice: 34, salePrice: 58, stock: 92, minStock: 30, status: "ativo" },
  { id: "prod-04", sku: "TNT-EPX-AZ", name: "Tinta epóxi azul RAL 5010", category: "Insumos químicos", unit: "GL", costPrice: 88, salePrice: 149, stock: 15, minStock: 10, status: "ativo" },
  { id: "prod-05", sku: "CX-PAP-M", name: "Caixa de papelão reforçada M", category: "Embalagens", unit: "UN", costPrice: 3.2, salePrice: 6.5, stock: 1240, minStock: 200, status: "ativo" },
  { id: "prod-06", sku: "MNJ-DOB-01", name: "Suporte de dobradiça reforçado", category: "Componentes", unit: "UN", costPrice: 6.8, salePrice: 13.9, stock: 0, minStock: 50, status: "ativo" },
  { id: "prod-07", sku: "FLM-PVC-01", name: "Filme PVC industrial 30cm", category: "Embalagens", unit: "RL", costPrice: 22, salePrice: 39, stock: 44, minStock: 15, status: "ativo" },
  { id: "prod-08", sku: "ENG-M10-ZN", name: "Engate rápido M10 zincado", category: "Ferragens", unit: "UN", costPrice: 4.1, salePrice: 8.9, stock: 310, minStock: 80, status: "inativo" },
  { id: "prod-09", sku: "RSN-PU-500", name: "Resina de poliuretano 500ml", category: "Insumos químicos", unit: "UN", costPrice: 41, salePrice: 72, stock: 6, minStock: 12, status: "ativo" },
  { id: "prod-10", sku: "ETQ-TER-100", name: "Etiqueta térmica 100x50mm", category: "Embalagens", unit: "RL", costPrice: 9.5, salePrice: 18, stock: 210, minStock: 40, status: "ativo" },
  { id: "prod-11", sku: "CBO-ELE-2M", name: "Cabo elétrico flexível 2,5mm 2m", category: "Componentes", unit: "UN", costPrice: 5.6, salePrice: 11.2, stock: 88, minStock: 25, status: "ativo" },
  { id: "prod-12", sku: "TAM-BOR-M", name: "Tampão de borracha padrão M", category: "Ferragens", unit: "CX", costPrice: 18, salePrice: 32, stock: 5, minStock: 10, status: "ativo" },
];

export function getMockProducts(): Product[] {
  return PRODUCTS;
}

export function getMockProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
