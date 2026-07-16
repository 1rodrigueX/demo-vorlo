import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppMessage, type OutgoingMedia } from "@/lib/whatsapp/send";
import { downloadCompanyAsset, getCompanyAssetSignedUrl } from "@/lib/storage/companyAssets";

export const SEND_CATALOG_TOOL: Anthropic.Tool = {
  name: "send_catalog",
  description:
    "Envia UM catálogo específico de produtos pro lead, como PDF direto no WhatsApp. Se a empresa tiver mais " +
    "de um catálogo, use só depois que a pessoa tiver escolhido qual quer entre as opções que você listou — " +
    "nunca chame sem saber qual catálogo a pessoa quer. Se a empresa tiver só um catálogo, pode chamar direto.",
  input_schema: {
    type: "object",
    properties: {
      file_name: {
        type: "string",
        description: "Nome exato do arquivo do catálogo a enviar, igual aparece na lista de catálogos disponíveis.",
      },
    },
    required: ["file_name"],
  },
};

type Admin = ReturnType<typeof createAdminClient>;

export async function executeSendCatalog(
  admin: Admin,
  tenantId: string,
  contactId: string,
  contactPhone: string,
  fileName: string,
): Promise<{ content: string; isError: boolean }> {
  const { data: catalogs } = await admin
    .from("company_catalogs")
    .select("storage_path, file_name")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (!catalogs?.length) {
    return { content: "Nenhum catálogo cadastrado ainda — avise que a equipe vai enviar em breve.", isError: true };
  }

  const catalog = catalogs.find((c) => c.file_name === fileName);
  if (!catalog) {
    return {
      content: `Catálogo "${fileName}" não encontrado. Catálogos disponíveis: ${catalogs.map((c) => c.file_name).join(", ")}.`,
      isError: true,
    };
  }

  const [buffer, signedUrl] = await Promise.all([
    downloadCompanyAsset(catalog.storage_path),
    getCompanyAssetSignedUrl(catalog.storage_path),
  ]);

  if (!buffer || !signedUrl) {
    return {
      content: "Não foi possível enviar o catálogo agora — avise que a equipe vai mandar em breve.",
      isError: true,
    };
  }

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

    return { content: `Catálogo "${catalog.file_name}" enviado com sucesso pelo WhatsApp.`, isError: false };
  } catch (err) {
    console.error("executeSendCatalog: falha ao enviar", catalog.file_name, err);
    return {
      content: "Não foi possível enviar o catálogo agora — avise que a equipe vai mandar em breve.",
      isError: true,
    };
  }
}
