import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Criptografia de segredos em repouso (chaves de API, tokens) guardados no
 * banco. AES-256-GCM (confidencialidade + integridade), com a chave-mestra em
 * SECRETS_ENC_KEY (32 bytes, em base64 ou hex) — nunca no banco/repo.
 *
 * Compatibilidade retroativa (importante num sistema em produção):
 *  - Sem SECRETS_ENC_KEY configurada, encryptSecret é NO-OP (devolve o texto
 *    puro). Ou seja: enquanto a chave não é definida na VPS, nada muda.
 *  - decryptSecret devolve texto sem o prefixo "enc:v1:" como está — então
 *    valores antigos (texto puro) continuam sendo lidos normalmente mesmo
 *    depois de ligar a criptografia. A migração acontece naturalmente quando
 *    cada segredo é regravado (ou por um backfill).
 */
const PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const raw = process.env.SECRETS_ENC_KEY;
  if (!raw) return null;
  const key =
    raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  return key.length === 32 ? key : null;
}

/** true se o valor está no formato criptografado desta biblioteca. */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

/** Criptografa um segredo. Sem chave-mestra configurada, devolve o texto puro (no-op). */
export function encryptSecret(plain: string): string {
  const key = getKey();
  if (!key || plain === "") return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

/** Descriptografa. Valor sem o prefixo é devolvido como está (dado antigo em texto puro). */
export function decryptSecret(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (!value.startsWith(PREFIX)) return value;
  const key = getKey();
  if (!key) throw new Error("SECRETS_ENC_KEY não configurada — impossível descriptografar um segredo cifrado");
  const buf = Buffer.from(value.slice(PREFIX.length), "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
