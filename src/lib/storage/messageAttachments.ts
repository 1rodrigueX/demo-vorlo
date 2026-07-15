import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const MESSAGE_ATTACHMENTS_BUCKET = "message-attachments";
export const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024;

export async function uploadMessageAttachment(
  tenantId: string,
  contactId: string,
  fileName: string,
  contentType: string,
  buffer: Buffer,
): Promise<{ storagePath: string } | { error: string }> {
  const admin = createAdminClient();
  const storagePath = `${tenantId}/${contactId}/${randomUUID()}-${fileName}`;

  const { error } = await admin.storage
    .from(MESSAGE_ATTACHMENTS_BUCKET)
    .upload(storagePath, buffer, { contentType });

  if (error) return { error: error.message };
  return { storagePath };
}

export async function getMessageAttachmentSignedUrl(
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(MESSAGE_ATTACHMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data) return null;
  return data.signedUrl;
}
