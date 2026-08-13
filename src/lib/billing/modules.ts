/** Catálogo dos módulos add-on vendidos à parte (Finanças, Estoque, Produção).
 * Preço em centavos — mesma fonte de verdade do checkout e da vitrine. */
export const MODULE_CATALOG = {
  financas: { key: "financas", label: "Finanças", priceCents: 7000, accessPath: "/financeiro" },
  estoque: { key: "estoque", label: "Estoque", priceCents: 5000, accessPath: "/estoque" },
  producao: { key: "producao", label: "Produção", priceCents: 5000, accessPath: "/producao" },
  erp: { key: "erp", label: "ERP", priceCents: 7000, accessPath: "/erp" },
} as const;

export type ModuleKey = keyof typeof MODULE_CATALOG;

export function isModuleKey(value: string | null | undefined): value is ModuleKey {
  return !!value && value in MODULE_CATALOG;
}
