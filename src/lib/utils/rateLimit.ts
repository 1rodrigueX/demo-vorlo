import "server-only";

type Bucket = { count: number; resetAt: number };

// Processo único PM2 (mesmo raciocínio do baileysClient.ts guardando sessão
// em globalThis) — não sobrevive a restart nem escala horizontalmente, mas é
// suficiente pra conter abuso de um endpoint público sem somar Redis.
const globalForRateLimit = globalThis as unknown as { __rateLimitBuckets?: Map<string, Bucket> };
const buckets = globalForRateLimit.__rateLimitBuckets ?? new Map<string, Bucket>();
globalForRateLimit.__rateLimitBuckets = buckets;

/** Janela fixa simples: `limit` chamadas por `windowMs` para a mesma `key`. */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;

  bucket.count++;
  return true;
}
