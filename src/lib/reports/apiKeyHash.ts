import "server-only";
import { createHash, randomBytes } from "node:crypto";

const KEY_PREFIX = "fai_";

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/** Gera uma chave nova: `fai_<32 chars>` — o prefixo curto (não-secreto) fica salvo pra exibir na lista de chaves. */
export function generateApiKey(): { rawKey: string; prefix: string } {
  const rawKey = `${KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
  return { rawKey, prefix: rawKey.slice(0, KEY_PREFIX.length + 6) };
}
