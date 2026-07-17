"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantId } from "@/lib/auth/current-user";

export type ActionState = { error?: string } | null;

const ATTACHMENTS_BUCKET = "contact-attachments";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function uploadContactAttachment(
  contactId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) {
    return { error: "Escolha um arquivo PDF" };
  }
  if (file.type !== "application/pdf") {
    return { error: "Só é permitido anexar PDF" };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "O arquivo precisa ter até 10MB" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado para este usuário" };

  // Confere, com o client comum (RLS), que o usuário enxerga esse contato
  // antes de usar o client de service role pro upload em si.
  const { data: contact } = await supabase.from("contacts").select("id").eq("id", contactId).maybeSingle();
  if (!contact) return { error: "Contato não encontrado" };

  const admin = createAdminClient();
  const storagePath = `${tenantId}/${contactId}/${crypto.randomUUID()}-${file.name}`;

  const { error: uploadError } = await admin.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) {
    console.error("uploadContactAttachment (storage) failed:", uploadError);
    return { error: "Não foi possível enviar o arquivo" };
  }

  const { error: insertError } = await admin.from("contact_attachments").insert({
    tenant_id: tenantId,
    contact_id: contactId,
    file_name: file.name,
    storage_path: storagePath,
    size_bytes: file.size,
    uploaded_by: user.id,
  });

  if (insertError) {
    console.error("uploadContactAttachment (insert) failed:", insertError);
    await admin.storage.from(ATTACHMENTS_BUCKET).remove([storagePath]);
    return { error: "Não foi possível salvar o anexo" };
  }

  revalidatePath(`/[tenantSlug]/contacts/${contactId}`, "page");
  return null;
}

export async function deleteContactAttachment(attachmentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // A leitura passa pelo client comum (RLS) pra confirmar que o usuário pode
  // mesmo apagar esse anexo antes de usar o client de service role.
  const { data: attachment } = await supabase
    .from("contact_attachments")
    .select("id, contact_id, storage_path")
    .eq("id", attachmentId)
    .maybeSingle();
  if (!attachment) return;

  const admin = createAdminClient();
  await admin.storage.from(ATTACHMENTS_BUCKET).remove([attachment.storage_path]);
  await admin.from("contact_attachments").delete().eq("id", attachmentId);

  revalidatePath(`/[tenantSlug]/contacts/${attachment.contact_id}`, "page");
}
