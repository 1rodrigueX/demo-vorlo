/** Catálogo dos módulos add-on vendidos à parte (Finanças, Estoque, Produção, ERP).
 * Preço em centavos — mesma fonte de verdade do checkout e da vitrine.
 * `standalone: true` deixa o módulo ser comprado sem CRM (cria um tenant do
 * zero, sem billing_plan_id — mesmo padrão já usado pra Transportadora, ver
 * provision-transportadora.ts). Só o ERP tem esse flag por enquanto; os
 * outros três continuam exigindo um tenant/CRM existente. */
export const MODULE_CATALOG = {
  financas: { key: "financas", label: "Finanças", priceCents: 7000, accessPath: "/financeiro", standalone: false },
  estoque: { key: "estoque", label: "Estoque", priceCents: 5000, accessPath: "/estoque", standalone: false },
  producao: { key: "producao", label: "Produção", priceCents: 5000, accessPath: "/producao", standalone: false },
  erp: { key: "erp", label: "ERP", priceCents: 7000, accessPath: "/erp", standalone: true },
} as const;

export type ModuleKey = keyof typeof MODULE_CATALOG;

export function isModuleKey(value: string | null | undefined): value is ModuleKey {
  return !!value && value in MODULE_CATALOG;
}
