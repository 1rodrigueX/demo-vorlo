export type Category = {
  id: string;
  name: string;
  parentName: string | null;
  productsCount: number;
  status: "ativo" | "inativo";
};

const CATEGORIES: Category[] = [
  { id: "cat-01", name: "Matéria-prima", parentName: null, productsCount: 24, status: "ativo" },
  { id: "cat-02", name: "Componentes", parentName: null, productsCount: 58, status: "ativo" },
  { id: "cat-03", name: "Ferragens", parentName: null, productsCount: 37, status: "ativo" },
  { id: "cat-04", name: "Insumos químicos", parentName: null, productsCount: 19, status: "ativo" },
  { id: "cat-05", name: "Embalagens", parentName: null, productsCount: 41, status: "ativo" },
  { id: "cat-06", name: "Chapas", parentName: "Matéria-prima", productsCount: 12, status: "ativo" },
  { id: "cat-07", name: "Perfis", parentName: "Componentes", productsCount: 15, status: "ativo" },
  { id: "cat-08", name: "Tintas e vernizes", parentName: "Insumos químicos", productsCount: 9, status: "inativo" },
];

export function getMockCategories(): Category[] {
  return CATEGORIES;
}
