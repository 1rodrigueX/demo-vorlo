import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppMessage, type OutgoingMedia } from "@/lib/whatsapp/send";
import { downloadCompanyAsset, getCompanyAssetSignedUrl } from "@/lib/storage/companyAssets";

export const SEND_PRODUCT_PHOTOS_TOOL: Anthropic.Tool = {
  name: "send_product_photos",
  description:
    "Envia as fotos dos modelos de produtos da empresa pro lead, como imagens direto no WhatsApp. Use assim " +
    "que a pessoa pedir foto/imagem do produto (ou algo tipo 'tem foto?', 'como que é?') — não precisa " +
    "esperar confirmação, é só mandar.",
  input_schema: { type: "object", properties: {} },
};

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function inferImageMimetype(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[ext] ?? "image/jpeg";
}

type Admin = ReturnType<typeof createAdminClient>;

export async function executeSendProductPhotos(
  admin: Admin,
  tenantId: string,
  contactId: string,
  contactPhone: string,
): Promise<{ content: string; isError: boolean }> {
  const { data: photos } = await admin
    .from("company_product_photos")
    .select("storage_path, file_name, caption")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (!photos?.length) {
    return { content: "Nenhuma foto de produto cadastrada ainda.", isError: true };
  }

  let sentCount = 0;
  for (const photo of photos) {
    const [buffer, signedUrl] = await Promise.all([
      downloadCompanyAsset(photo.storage_path),
      getCompanyAssetSignedUrl(photo.storage_path),
    ]);
    if (!buffer || !signedUrl) continue;

    const mimetype = inferImageMimetype(photo.file_name);
    const media: OutgoingMedia = {
      kind: "image",
      buffer,
      mimetype,
      fileName: photo.file_name,
      publicUrl: signedUrl,
    };

    try {
      const result = await sendWhatsAppMessage(tenantId, contactPhone, photo.caption ?? "", media);

      const { data: waMessage } = await admin
        .from("whatsapp_messages")
        .insert({
          tenant_id: tenantId,
          contact_id: contactId,
          twilio_sid: result.externalId,
          direction: "outbound",
          from_number: result.from,
          to_number: result.to,
          body: photo.caption ?? null,
          status: result.initialStatus,
          sent_by: null,
          media_storage_path: photo.storage_path,
          media_content_type: mimetype,
          media_file_name: photo.file_name,
        })
        .select("id")
        .single();

      await admin.from("activities").insert({
        tenant_id: tenantId,
        contact_id: contactId,
        type: "whatsapp",
        direction: "outbound",
        body: `[imagem] ${photo.caption ?? photo.file_name}`,
        whatsapp_message_id: waMessage?.id ?? null,
      });

      sentCount++;
    } catch (err) {
      console.error("executeSendProductPhotos: falha ao enviar", photo.file_name, err);
    }
  }

  if (!sentCount) {
    return { content: "Não foi possível enviar as fotos agora.", isError: true };
  }

  return { content: `${sentCount} foto(s) enviada(s) com sucesso pelo WhatsApp.`, isError: false };
}
