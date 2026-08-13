import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Formatação compartilhada do módulo ERP. `formatCurrency` já existe em
 * `@/lib/utils/currency` (reusado direto nas páginas) — aqui só o que falta:
 * data curta (sem hora), que as tabelas do ERP usam o tempo todo.
 */
export function formatShortDate(date: string | Date): string {
  return format(typeof date === "string" ? new Date(date) : date, "dd/MM/yyyy", { locale: ptBR });
}

/** Documento (CPF/CNPJ) só pra exibição — sem validação, é mock. */
export function formatDocument(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return value;
}
