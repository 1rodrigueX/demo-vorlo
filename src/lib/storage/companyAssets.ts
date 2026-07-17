import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const COMPANY_ASSETS_BUCKET = "company-assets";
export const MAX_CATALOG_SIZE = 20 * 1024 * 1024;
export const MAX_PRODUCT_PHOTO_SIZE = 10 * 1024 * 1024;
export const MAX_SOUND_SIZE = 2 * 1024 * 1024;

const DIACRITIC_MARKS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

/** Chave do storage do Supabase não aceita acento/espaço/etc — o nome original continua guardado à parte (coluna file_name) só pra exibição. */
function sanitizeStorageFileName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  const base = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  const ext = dotIndex > 0 ? fileName.slice(dotIndex + 1) : "";

  const safeBase =
    base
      .normalize("NFD")
      .replace(DIACRITIC_MARKS_REGEX, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "arquivo";
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);

  return safeExt ? `${safeBase}.${safeExt}` : safeBase;
}

export async function uploadCompanyAsset(
  tenantId: string,
  kind: "catalog" | "photos" | "logo" | "sound",
  fileName: string,
  contentType: string,
  buffer: Buffer,
): Promise<{ storagePath: string } | { error: string }> {
  const admin = createAdminClient();
  const storagePath = `${tenantId}/${kind}/${randomUUID()}-${sanitizeStorageFileName(fileName)}`;

  const { error } = await admin.storage
    .from(COMPANY_ASSETS_BUCKET)
    .upload(storagePath, buffer, { contentType });

  if (error) return { error: error.message };
  return { storagePath };
}

export async function getCompanyAssetSignedUrl(
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(COMPANY_ASSETS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data) return null;
  return data.signedUrl;
}

export async function deleteCompanyAsset(storagePath: string): Promise<void> {
  const admin = createAdminClient();
  await admin.storage.from(COMPANY_ASSETS_BUCKET).remove([storagePath]);
}

/** Baixa o arquivo do storage como Buffer — usado pra anexar num envio de WhatsApp (Baileys precisa do buffer, não só da URL). */
export async function downloadCompanyAsset(storagePath: string): Promise<Buffer | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(COMPANY_ASSETS_BUCKET).download(storagePath);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}
