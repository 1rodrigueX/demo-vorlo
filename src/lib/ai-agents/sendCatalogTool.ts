import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppMessage, type OutgoingMedia } from "@/lib/whatsapp/send";
import { downloadCompanyAsset, getCompanyAssetSignedUrl } from "@/lib/storage/companyAssets";

export const SEND_CATALOG_TOOL: Anthropic.Tool = {
  name: "send_catalog",
  description:
    "Envia o(s) catálogo(s) de produtos da empresa pro lead, como arquivo PDF direto no WhatsApp. Use assim " +
    "que a pessoa pedir o catálogo (ou algo equivalente, tipo 'manda os produtos aí') — não precisa esperar " +
    "confirmação, é só mandar.",
  input_schema: { type: "object", properties: {} },
};

type Admin = ReturnType<typeof createAdminClient>;

export async function executeSendCatalog(
  admin: Admin,
  tenantId: string,
  contactId: string,
  contactPhone: string,
): Promise<{ content: string; isError: boolean }> {
  const { data: catalogs } = await admin
    .from("company_catalogs")
    .select("storage_path, file_name")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (!catalogs?.length) {
    return { content: "Nenhum catálogo cadastrado ainda — avise que a equipe vai enviar em breve.", isError: true };
  }

  let sentCount = 0;
  for (const catalog of catalogs) {
    const [buffer, signedUrl] = await Promise.all([
      downloadCompanyAsset(catalog.storage_path),
      getCompanyAssetSignedUrl(catalog.storage_path),
    ]);
    if (!buffer || !signedUrl) continue;

    const media: OutgoingMedia = {
      kind: "document",
      buffer,
      mimetype: "application/pdf",
      fileName: catalog.file_name,
      publicUrl: signedUrl,
    };

    try {
      const result = await sendWhatsAppMessage(tenantId, contactPhone, "", media);

      const { data: waMessage } = await admin
        .from("whatsapp_messages")
        .insert({
          tenant_id: tenantId,
          contact_id: contactId,
          twilio_sid: result.externalId,
          direction: "outbound",
          from_number: result.from,
          to_number: result.to,
          body: null,
          status: result.initialStatus,
          sent_by: null,
          media_storage_path: catalog.storage_path,
          media_content_type: "application/pdf",
          media_file_name: catalog.file_name,
        })
        .select("id")
        .single();

      await admin.from("activities").insert({
        tenant_id: tenantId,
        contact_id: contactId,
        type: "whatsapp",
        direction: "outbound",
        body: `[arquivo] ${catalog.file_name}`,
        whatsapp_message_id: waMessage?.id ?? null,
      });

      sentCount++;
    } catch (err) {
      console.error("executeSendCatalog: falha ao enviar", catalog.file_name, err);
    }
  }

  if (!sentCount) {
    return {
      content: "Não foi possível enviar o catálogo agora — avise que a equipe vai mandar em breve.",
      isError: true,
    };
  }

  return { content: `${sentCount} catálogo(s) enviado(s) com sucesso pelo WhatsApp.`, isError: false };
}
