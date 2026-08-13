/**
 * Mapas de status → { label, className } por domínio. Cada tabela/tela usa o
 * mapa correspondente com o `StatusBadge` genérico (`badges/StatusBadge.tsx`).
 * Cores semânticas puras do Tailwind (emerald/amber/red/...) — não são
 * redefinidas no dark mode, igual referências como Linear/Bling (mantém
 * legibilidade e reconhecimento de cor em ambos os temas).
 */

export type StatusEntry = { label: string; className: string };
export type StatusMap<K extends string = string> = Record<K, StatusEntry>;

// Tailwind precisa das classes completas no código-fonte pra não fazer
// tree-shake (JIT lê o texto do arquivo) — por isso as classes abaixo são
// escritas por extenso em vez de via template string dinâmica.
export const QUOTE_STATUS_MAP: StatusMap = {
  rascunho: { label: "Rascunho", className: "bg-gray-100 text-gray-600 border border-gray-200" },
  enviada: { label: "Enviada", className: "bg-sky-50 text-sky-700 border border-sky-200" },
  visualizada: { label: "Visualizada", className: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  negociacao: { label: "Negociação", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  aprovada: { label: "Aprovada", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  recusada: { label: "Recusada", className: "bg-red-50 text-red-700 border border-red-200" },
  expirada: { label: "Expirada", className: "bg-orange-50 text-orange-700 border border-orange-200" },
  cancelada: { label: "Cancelada", className: "bg-gray-100 text-gray-500 border border-gray-200 line-through" },
};

export const ORDER_STATUS_MAP: StatusMap = {
  pendente: { label: "Pendente", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  processando: { label: "Processando", className: "bg-sky-50 text-sky-700 border border-sky-200" },
  faturado: { label: "Faturado", className: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
  entregue: { label: "Entregue", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  cancelado: { label: "Cancelado", className: "bg-red-50 text-red-700 border border-red-200" },
};

export const PRODUCTION_STATUS_MAP: StatusMap = {
  planejada: { label: "Planejada", className: "bg-gray-100 text-gray-600 border border-gray-200" },
  em_producao: { label: "Em produção", className: "bg-sky-50 text-sky-700 border border-sky-200" },
  atrasada: { label: "Atrasada", className: "bg-red-50 text-red-700 border border-red-200" },
  concluida: { label: "Concluída", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  cancelada: { label: "Cancelada", className: "bg-gray-100 text-gray-500 border border-gray-200 line-through" },
};

export const FINANCE_STATUS_MAP: StatusMap = {
  pendente: { label: "Pendente", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  pago: { label: "Pago", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  vencido: { label: "Vencido", className: "bg-red-50 text-red-700 border border-red-200" },
  cancelado: { label: "Cancelado", className: "bg-gray-100 text-gray-500 border border-gray-200 line-through" },
};

export const FISCAL_STATUS_MAP: StatusMap = {
  processando: { label: "Processando", className: "bg-sky-50 text-sky-700 border border-sky-200" },
  autorizada: { label: "Autorizada", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  rejeitada: { label: "Rejeitada", className: "bg-red-50 text-red-700 border border-red-200" },
  cancelada: { label: "Cancelada", className: "bg-gray-100 text-gray-500 border border-gray-200 line-through" },
};

export const STOCK_STATUS_MAP: StatusMap = {
  normal: { label: "Normal", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  baixo: { label: "Baixo", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  esgotado: { label: "Esgotado", className: "bg-red-50 text-red-700 border border-red-200" },
};

export const ACTIVE_STATUS_MAP: StatusMap = {
  ativo: { label: "Ativo", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  inativo: { label: "Inativo", className: "bg-gray-100 text-gray-500 border border-gray-200" },
};

export const PURCHASE_STATUS_MAP: StatusMap = {
  pendente: { label: "Pendente", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  aprovado: { label: "Aprovado", className: "bg-sky-50 text-sky-700 border border-sky-200" },
  recebido: { label: "Recebido", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  cancelado: { label: "Cancelado", className: "bg-gray-100 text-gray-500 border border-gray-200 line-through" },
};

export const RECEIPT_STATUS_MAP: StatusMap = {
  conferencia: { label: "Em conferência", className: "bg-sky-50 text-sky-700 border border-sky-200" },
  concluido: { label: "Concluído", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  divergente: { label: "Divergente", className: "bg-red-50 text-red-700 border border-red-200" },
};

export const URGENCY_STATUS_MAP: StatusMap = {
  baixa: { label: "Baixa", className: "bg-gray-100 text-gray-600 border border-gray-200" },
  media: { label: "Média", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  alta: { label: "Alta", className: "bg-red-50 text-red-700 border border-red-200" },
};

export const MOVEMENT_TYPE_MAP: StatusMap = {
  entrada: { label: "Entrada", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  saida: { label: "Saída", className: "bg-red-50 text-red-700 border border-red-200" },
  ajuste: { label: "Ajuste", className: "bg-amber-50 text-amber-700 border border-amber-200" },
};

export const INVENTORY_STATUS_MAP: StatusMap = {
  planejado: { label: "Planejado", className: "bg-gray-100 text-gray-600 border border-gray-200" },
  em_andamento: { label: "Em andamento", className: "bg-sky-50 text-sky-700 border border-sky-200" },
  concluido: { label: "Concluído", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
};
