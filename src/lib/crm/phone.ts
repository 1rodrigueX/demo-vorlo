/**
 * Espelho em TypeScript da função `public.normalize_phone_br` (ver
 * 0070_contact_dedupe.sql). O banco é quem garante a unicidade — esta cópia
 * existe só pra CONSULTAR por `contacts.phone_key` antes de inserir, e assim
 * transformar uma violação de índice único num "achei o contato existente".
 *
 * As duas implementações precisam andar juntas: se mudar a regra aqui, mude
 * na migration (e vice-versa, com backfill da coluna gerada). Divergência não
 * corrompe dado — o índice único continua barrando —, só faz a busca falhar e
 * cair no caminho de tratamento de conflito.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  // "+" com DDI que não é 55: número estrangeiro declarado. Sem essa saída,
  // um +1 415 555 2671 (11 dígitos, igual a um celular brasileiro com DDD)
  // seria remontado como se fosse do Brasil.
  const hasPlus = trimmed.startsWith("+");
  if (hasPlus && !digits.startsWith("55")) return `+${digits}`;

  // Zero de tronco que muita gente ainda digita antes do DDD (011 98888-7777),
  // e o 00 de discagem internacional.
  if (!hasPlus) digits = digits.replace(/^0+/, "");
  if (!digits) return null;

  let local: string;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    local = digits.slice(2);
  } else if (digits.length === 10 || digits.length === 11) {
    local = digits;
  } else {
    return `+${digits}`;
  }

  const ddd = local.slice(0, 2);
  let subscriber = local.slice(2);

  // Nono dígito: celular antigo de 8 dígitos (começa em 6-9) é o mesmo número
  // do formato novo. Fixo (2-5) não ganha o 9.
  if (subscriber.length === 8 && subscriber[0] >= "6" && subscriber[0] <= "9") {
    subscriber = `9${subscriber}`;
  }

  return `+55${ddd}${subscriber}`;
}

/** Mesma normalização de `contacts.email_key`. */
export function normalizeEmail(raw: string | null | undefined): string | null {
  const clean = (raw ?? "").trim().toLowerCase();
  return clean || null;
}

/** Código do Postgres para violação de índice/constraint único. */
export const UNIQUE_VIOLATION = "23505";

/** true quando o erro do Supabase é a colisão do índice de telefone duplicado. */
export function isDuplicatePhoneError(error: { code?: string; message?: string } | null): boolean {
  return error?.code === UNIQUE_VIOLATION && (error.message ?? "").includes("contacts_tenant_phone_key");
}
