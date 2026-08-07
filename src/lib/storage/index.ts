import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createSignedUrl as localSignedUrl,
  deleteObject as localDelete,
  getObject as localGet,
  listObjects as localList,
  putObject as localPut,
  type StorageBucket,
  type StoredObject,
} from "@/lib/storage/driver";

/**
 * Camada única de arquivos, com dois backends: o Storage do Supabase (o de
 * hoje) e o disco da própria VPS (o do futuro). Quem escolhe é STORAGE_DRIVER.
 *
 * Existe uma chave em vez de uma troca seca porque os arquivos JÁ ENVIADOS
 * vivem no Supabase. Virar o backend sem levar os arquivos junto quebraria
 * todo logo e todo anexo existente — e "não quebrar nada que funciona" foi a
 * regra. A ordem segura é:
 *
 *   1. deployar com STORAGE_DRIVER=supabase (o padrão — nada muda)
 *   2. rodar `npm run storage:migrate` pra copiar tudo pro disco
 *   3. virar pra STORAGE_DRIVER=local e reiniciar
 *   4. conferir; se algo faltar, voltar a chave pra supabase é instantâneo
 */
export type { StorageBucket, StoredObject };

function driver(): "supabase" | "local" {
  return process.env.STORAGE_DRIVER === "local" ? "local" : "supabase";
}

export async function putObject(
  bucket: StorageBucket,
  objectPath: string,
  body: Buffer,
  contentType: string,
): Promise<{ error?: string }> {
  if (driver() === "local") return localPut(bucket, objectPath, body);

  const { error } = await createAdminClient().storage.from(bucket).upload(objectPath, body, { contentType });
  return error ? { error: error.message } : {};
}

export async function getObject(bucket: StorageBucket, objectPath: string): Promise<Buffer | null> {
  if (driver() === "local") return localGet(bucket, objectPath);

  const { data, error } = await createAdminClient().storage.from(bucket).download(objectPath);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteObject(bucket: StorageBucket, objectPath: string): Promise<void> {
  if (driver() === "local") return localDelete(bucket, objectPath);

  await createAdminClient().storage.from(bucket).remove([objectPath]);
}

export async function listObjects(bucket: StorageBucket, prefix = ""): Promise<StoredObject[]> {
  if (driver() === "local") return localList(bucket, prefix);

  const { data } = await createAdminClient()
    .storage.from(bucket)
    .list(prefix, { sortBy: { column: "created_at", order: "desc" } });

  return (data ?? []).map((item) => ({
    name: item.name,
    createdAt: new Date(item.created_at ?? Date.now()),
    size: (item.metadata as { size?: number } | null)?.size ?? 0,
  }));
}

export async function createSignedUrl(
  bucket: StorageBucket,
  objectPath: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  if (driver() === "local") return localSignedUrl(bucket, objectPath, expiresInSeconds);

  const { data, error } = await createAdminClient()
    .storage.from(bucket)
    .createSignedUrl(objectPath, expiresInSeconds);

  return error || !data ? null : data.signedUrl;
}
