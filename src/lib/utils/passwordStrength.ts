export type PasswordStrength = "fraca" | "media" | "forte";

/** Heurística simples (comprimento + variedade de caracteres) — sem lib externa, suficiente pra um indicador visual. */
export function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) return null;

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return "fraca";
  if (score === 3) return "media";
  return "forte";
}
