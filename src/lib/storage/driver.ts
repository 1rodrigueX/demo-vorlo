import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Armazenamento de arquivos em disco, no lugar do Storage do Supabase.
 *
 * Mesma divisão em "buckets" e os mesmos quatro verbos (upload, download,
 * remove, signed URL), pra as chamadas existentes não mudarem de forma.
 *
 * Disco local e não S3 por enquanto: a aplicação roda num processo único na
 * VPS, então não há o que sincronizar entre máquinas, e ligar MinIO custaria
 * um serviço a mais pra manter. Trocar por S3/MinIO depois é reescrever só
 * este arquivo — nada além dele conhece o backend.
 *
 * ⚠️ O bucket de BACKUPS é a exceção: guardar backup no mesmo disco do banco
 * derrota o propósito de ter backup. Ver a nota em api/cron/backup.
 */

export type StorageBucket = "company-assets" | "contact-attachments" | "backups";

const SIGNATURE_BYTES = 32;

function storageRoot(): string {
  return process.env.STORAGE_ROOT || path.join(process.cwd(), ".storage");
}

function signingSecret(): string {
  const secret = process.env.STORAGE_SIGNING_SECRET || process.env.SECRETS_ENC_KEY || process.env.CRON_SECRET;
  if (!secret) {
    throw new Error("STORAGE_SIGNING_SECRET não configurada — sem ela não dá pra assinar URLs de arquivo");
  }
  return secret;
}

/**
 * Resolve o caminho no disco recusando qualquer coisa que escape do bucket.
 *
 * O `path` vem de dado guardado no banco (storage_path), mas passa por aqui de
 * qualquer forma: um "../../.env" numa linha adulterada não pode virar leitura
 * de arquivo do servidor.
 */
function resolveObjectPath(bucket: StorageBucket, objectPath: string): string {
  const bucketRoot = path.resolve(storageRoot(), bucket);
  const resolved = path.resolve(bucketRoot, objectPath);

  if (resolved !== bucketRoot && !resolved.startsWith(bucketRoot + path.sep)) {
    throw new Error("Caminho de arquivo inválido");
  }
  return resolved;
}

export async function putObject(
  bucket: StorageBucket,
  objectPath: string,
  body: Buffer,
): Promise<{ error?: string }> {
  try {
    const target = resolveObjectPath(bucket, objectPath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gravar o arquivo";
    console.error("putObject falhou", bucket, objectPath, message);
    return { error: message };
  }
}

export async function getObject(bucket: StorageBucket, objectPath: string): Promise<Buffer | null> {
  try {
    return await readFile(resolveObjectPath(bucket, objectPath));
  } catch {
    return null;
  }
}

export async function deleteObject(bucket: StorageBucket, objectPath: string): Promise<void> {
  try {
    await rm(resolveObjectPath(bucket, objectPath), { force: true });
  } catch (err) {
    // Apagar arquivo que já não existe não é erro — o chamador quer o efeito,
    // não a operação.
    console.error("deleteObject falhou", bucket, objectPath, err);
  }
}

export type StoredObject = { name: string; createdAt: Date; size: number };

/** Lista um bucket (não-recursivo), ordenado do mais novo pro mais antigo. */
export async function listObjects(bucket: StorageBucket, prefix = ""): Promise<StoredObject[]> {
  try {
    const dir = resolveObjectPath(bucket, prefix);
    const entries = await readdir(dir, { withFileTypes: true });

    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const info = await stat(path.join(dir, entry.name));
          return { name: entry.name, createdAt: info.mtime, size: info.size };
        }),
    );

    return files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch {
    return [];
  }
}

// ─── URLs assinadas ──────────────────────────────────────────────────────────

function sign(bucket: StorageBucket, objectPath: string, expiresAt: number): string {
  return createHmac("sha256", signingSecret())
    .update(`${bucket}:${objectPath}:${expiresAt}`)
    .digest("hex")
    .slice(0, SIGNATURE_BYTES);
}

/**
 * URL temporária pra servir o arquivo sem sessão — mesma ideia do
 * createSignedUrl do Supabase. Quem valida é a rota /api/storage.
 */
export function createSignedUrl(
  bucket: StorageBucket,
  objectPath: string,
  expiresInSeconds = 3600,
): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const params = new URLSearchParams({ exp: String(expiresAt), sig: sign(bucket, objectPath, expiresAt) });
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";

  // Segmentos codificados um a um: o caminho tem "/" que precisa continuar
  // sendo separador, mas o nome do arquivo pode ter caractere especial.
  const encoded = objectPath.split("/").map(encodeURIComponent).join("/");
  return `${base}/api/storage/${bucket}/${encoded}?${params.toString()}`;
}

/** true se a assinatura confere e ainda não venceu. */
export function verifySignedUrl(
  bucket: StorageBucket,
  objectPath: string,
  exp: string | null,
  sig: string | null,
): boolean {
  if (!exp || !sig) return false;

  const expiresAt = Number(exp);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return false;

  const expected = sign(bucket, objectPath, expiresAt);
  if (expected.length !== sig.length) return false;

  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

export function isStorageBucket(value: string): value is StorageBucket {
  return value === "company-assets" || value === "contact-attachments" || value === "backups";
}
