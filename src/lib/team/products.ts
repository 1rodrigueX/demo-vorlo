export const TOGGLEABLE_PRODUCTS = ["transportadora", "financas", "estoque", "producao"] as const;
export type ToggleableProduct = (typeof TOGGLEABLE_PRODUCTS)[number];

export const PRODUCT_LABEL: Record<ToggleableProduct, string> = {
  transportadora: "Transportadora",
  financas: "Financeiro",
  estoque: "Estoque",
  producao: "Produção",
};
