import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClientForTenant } from "@/lib/anthropic/client";
import { buildSdrLeadPrompt, type CompanyProfileContext } from "@/lib/ai-agents/sdrLeadPrompt";
import { COMPLETE_LEAD_REGISTRATION_TOOL, executeCompleteLeadRegistration } from "@/lib/ai-agents/sdrLeadTool";
import { ensureLeadInSdrStage } from "@/lib/ai-agents/sdrPipelineStage";
import { SEARCH_COMPANY_WEBSITE_TOOL, executeSearchCompanyWebsite } from "@/lib/ai-agents/companyWebsiteTool";
import { SEND_CATALOG_TOOL, executeSendCatalog } from "@/lib/ai-agents/sendCatalogTool";
import { SEND_PRODUCT_PHOTOS_TOOL, executeSendProductPhotos } from "@/lib/ai-agents/sendProductPhotosTool";
import { BUSCAR_PRODUTOS_ERP_TOOL, executeBuscarProdutosErp } from "@/lib/ai-agents/erpCatalogTool";
import { MONTAR_PROPOSTA_ERP_TOOL, executeMontarPropostaErp } from "@/lib/ai-agents/erpPropostaTool";
import { sendWhatsAppMessage, type OutgoingMedia } from "@/lib/whatsapp/send";
import {
  getMessageAttachmentBytes,
  uploadMessageAttachment,
  getMessageAttachmentSignedUrl,
} from "@/lib/storage/messageAttachments";
import { transcribeAudio, synthesizeSpeech, isSpeechEnabled } from "@/lib/speech";
import { publishChange } from "@/lib/realtime/bus";

const MAX_HISTORY = 20;
const MAX_TOOL_ITERATIONS = 4;
/** Só processa mídia (baixar imagem, transcrever áudio) nas mensagens mais recentes — o resto vira rótulo, pra não estourar contexto/custo. */
const MEDIA_WINDOW = 6;
/** Teto de imagens enviadas ao modelo por rodada. */
const MAX_VISION_IMAGES = 3;

const VISION_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

type HistoryRow = {
  direction: string;
  body: string | null;
  media_storage_path: string | null;
  media_content_type: string | null;
};

/**
 * Monta as mensagens pro modelo a partir do histórico, agora com MÍDIA: a
 * imagem que o lead mandou vira bloco de visão (o SDR "vê"), e o áudio é
 * transcrito e entra como texto (o SDR "ouve"). Só a janela recente carrega a
 * mídia de fato; mais antigas viram um rótulo curto ("[imagem]"/"[áudio]").
 * Funde turnos consecutivos do mesmo papel (o lead pode mandar 3 seguidas).
 */
async function buildSdrMessages(
  history: HistoryRow[],
): Promise<{ messages: Anthropic.MessageParam[]; lastInboundWasAudio: boolean }> {
  const ordered = [...history].reverse(); // do mais antigo pro mais novo
  const messages: Anthropic.MessageParam[] = [];
  let imagesUsed = 0;
  let lastInboundWasAudio = false;

  for (let idx = 0; idx < ordered.length; idx++) {
    const row = ordered[idx];
    const role: "user" | "assistant" = row.direction === "inbound" ? "user" : "assistant";
    const isRecent = idx >= ordered.length - MEDIA_WINDOW;
    const blocks: Anthropic.ContentBlockParam[] = [];

    const text = row.body?.trim() ?? "";
    const mime = row.media_content_type ?? "";
    const isImage = mime.startsWith("image/");
    const isAudio = mime.startsWith("audio/");
    // Mídia só é "vista/ouvida" quando veio DO lead. Mídia de saída (ex.: o
    // próprio áudio TTS do SDR) entra só como o texto que já está salvo.
    const inboundMedia = role === "user" && !!row.media_storage_path;

    if (role === "user") lastInboundWasAudio = false;

    if (inboundMedia && isImage) {
      if (isRecent && imagesUsed < MAX_VISION_IMAGES) {
        const bytes = await getMessageAttachmentBytes(row.media_storage_path!);
        if (bytes) {
          blocks.push({
            type: "image",
            source: {
              type: "base64",
              media_type: (VISION_MEDIA_TYPES.has(mime) ? mime : "image/jpeg") as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: bytes.toString("base64"),
            },
          });
          imagesUsed++;
        }
      }
      if (text) blocks.push({ type: "text", text });
      else if (!blocks.length) blocks.push({ type: "text", text: "[o lead enviou uma imagem]" });
    } else if (inboundMedia && isAudio) {
      lastInboundWasAudio = true;
      let transcript: string | null = null;
      if (isRecent) {
        const bytes = await getMessageAttachmentBytes(row.media_storage_path!);
        if (bytes) transcript = await transcribeAudio(bytes, mime || "audio/ogg");
      }
      const spoken = transcript || text;
      blocks.push({
        type: "text",
        text: spoken ? `[áudio do lead] ${spoken}` : "[o lead enviou um áudio que não pôde ser transcrito]",
      });
    } else if (inboundMedia) {
      blocks.push({ type: "text", text: text ? `[arquivo] ${text}` : "[o lead enviou um arquivo]" });
    } else if (text) {
      blocks.push({ type: "text", text });
    }

    if (!blocks.length) continue;

    // Funde com a mensagem anterior se for o mesmo papel (a API não aceita dois
    // turnos seguidos do mesmo role).
    const prev = messages[messages.length - 1];
    if (prev && prev.role === role) {
      const prevContent = Array.isArray(prev.content)
        ? prev.content
        : [{ type: "text", text: prev.content } as Anthropic.ContentBlockParam];
      prev.content = [...prevContent, ...blocks];
    } else {
      messages.push({ role, content: blocks });
    }
  }

  // A API exige que a conversa comece por "user" — descarta assistants iniciais.
  while (messages.length && messages[0].role !== "user") messages.shift();

  return { messages, lastInboundWasAudio };
}

/**
 * Faz o SDR de IA conversar automaticamente com um lead novo pelo WhatsApp
 * pra coletar os dados de cadastro — acionado pelo recordInboundMessage
 * (Twilio e Baileys) enquanto contacts.needs_registration for true. Não faz
 * nada se o tenant não tiver um agente tipo 'sdr' ativo (recurso opt-in).
 */
export async function runSdrLeadTurn(tenantId: string, contactId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: agent } = await admin
    .from("ai_agents")
    .select("id, model, system_prompt")
    .eq("tenant_id", tenantId)
    .eq("type", "sdr")
    .eq("status", "active")
    .maybeSingle();

  if (!agent) return;

  const { data: contact } = await admin
    .from("contacts")
    .select("id, name, phone, created_by, needs_registration")
    .eq("id", contactId)
    .maybeSingle();

  if (!contact || !contact.phone || !contact.needs_registration) return;

  // Já bota o lead no pipeline (etapa "Atendimento SDR") assim que a IA
  // começa a conversar, mesmo antes do cadastro/qualificação terminar.
  await ensureLeadInSdrStage(admin, tenantId, contactId, contact.created_by, contact.name);

  let client: Anthropic;
  try {
    client = await getAnthropicClientForTenant(tenantId);
  } catch (err) {
    console.error("runSdrLeadTurn: Anthropic não configurado pro tenant", tenantId, err);
    return;
  }

  const { data: history } = await admin
    .from("whatsapp_messages")
    .select("direction, body, media_storage_path, media_content_type")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY);

  const { messages, lastInboundWasAudio } = await buildSdrMessages((history ?? []) as HistoryRow[]);

  if (!messages.length) return;

  const [{ data: companyProfile }, { data: productPhotos }, { data: catalogs }] = await Promise.all([
    admin
      .from("tenant_company_profile")
      .select("description, website, instagram")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    admin.from("company_product_photos").select("caption").eq("tenant_id", tenantId),
    admin
      .from("company_catalogs")
      .select("file_name")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true }),
  ]);

  const company: CompanyProfileContext | null = companyProfile
    ? {
        description: companyProfile.description,
        website: companyProfile.website,
        instagram: companyProfile.instagram,
        catalogNames: (catalogs ?? []).map((c) => c.file_name),
        hasProductPhotos: (productPhotos ?? []).length > 0,
        productPhotoCaptions: (productPhotos ?? []).map((p) => p.caption).filter((c): c is string => !!c),
      }
    : null;

  const system = buildSdrLeadPrompt(agent, contact, company);
  // Catálogo/proposta do ERP entram sempre (igual complete_lead_registration) —
  // não são condicionadas a needs_registration: essa função inteira já só roda
  // enquanto o cadastro não terminou (guard lá em cima), então gatear por
  // "cadastro completo" faria a tool nunca ficar disponível na prática.
  const tools: Anthropic.Tool[] = [COMPLETE_LEAD_REGISTRATION_TOOL, BUSCAR_PRODUTOS_ERP_TOOL, MONTAR_PROPOSTA_ERP_TOOL];
  if (company?.website) tools.push(SEARCH_COMPANY_WEBSITE_TOOL);
  if (company?.catalogNames.length) tools.push(SEND_CATALOG_TOOL);
  if (company?.hasProductPhotos) tools.push(SEND_PRODUCT_PHOTOS_TOOL);

  let finalText = "";
  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await client.messages.create({
        model: agent.model,
        max_tokens: 800,
        system,
        tools,
        messages,
      });

      const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text");
      finalText = textBlocks.map((b) => b.text).join("\n").trim();

      messages.push({ role: "assistant", content: response.content });
      if (response.stop_reason !== "tool_use" || !toolUses.length) break;

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUses) {
        let result: { content: string; isError: boolean };
        if (toolUse.name === "search_company_website" && company?.website) {
          result = await executeSearchCompanyWebsite(admin, tenantId, company.website);
        } else if (toolUse.name === "send_catalog") {
          const fileName = String((toolUse.input as { file_name?: string } | undefined)?.file_name ?? "").trim();
          result = fileName
            ? await executeSendCatalog(admin, tenantId, contactId, contact.phone, fileName)
            : { content: "Informe o file_name exato do catálogo escolhido pelo lead.", isError: true };
        } else if (toolUse.name === "send_product_photos") {
          result = await executeSendProductPhotos(admin, tenantId, contactId, contact.phone);
        } else if (toolUse.name === "buscar_produtos_erp") {
          result = await executeBuscarProdutosErp(admin, tenantId, (toolUse.input ?? {}) as Record<string, unknown>);
        } else if (toolUse.name === "montar_proposta_erp") {
          result = await executeMontarPropostaErp(
            admin,
            tenantId,
            contactId,
            contact.created_by,
            (toolUse.input ?? {}) as Record<string, unknown>,
          );
        } else {
          result = await executeCompleteLeadRegistration(
            admin,
            tenantId,
            contactId,
            contact.created_by,
            (toolUse.input ?? {}) as Record<string, unknown>,
          );
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result.content,
          is_error: result.isError,
        });
      }
      messages.push({ role: "user", content: toolResults });
    }
  } catch (err) {
    console.error("runSdrLeadTurn: falha no loop do agente", err);
    await admin.from("ai_agent_logs").insert({
      tenant_id: tenantId,
      agent_id: agent.id,
      event_type: "error",
      detail: { message: err instanceof Error ? err.message : "erro desconhecido", contactId },
    });
    return;
  }

  if (!finalText) return;

  // Voz-a-voz: se o lead falou por áudio e a fala está configurada, o SDR
  // também responde por áudio. Cai pra texto se a síntese ou o upload falhar.
  let media: OutgoingMedia | undefined;
  let mediaMeta: { storagePath: string; contentType: string; fileName: string } | undefined;
  if (lastInboundWasAudio && isSpeechEnabled()) {
    try {
      const ogg = await synthesizeSpeech(finalText);
      if (ogg) {
        const fileName = "resposta.ogg";
        const uploaded = await uploadMessageAttachment(tenantId, contactId, fileName, "audio/ogg", ogg);
        if (!("error" in uploaded)) {
          const signed = await getMessageAttachmentSignedUrl(uploaded.storagePath);
          if (signed) {
            media = { kind: "audio", buffer: ogg, mimetype: "audio/ogg; codecs=opus", fileName, publicUrl: signed };
            mediaMeta = { storagePath: uploaded.storagePath, contentType: "audio/ogg", fileName };
          }
        }
      }
    } catch (err) {
      console.error("runSdrLeadTurn: falha ao gerar áudio de resposta (segue em texto)", err);
    }
  }

  try {
    // Áudio vira nota de voz sem legenda; o texto continua salvo no histórico.
    const result = await sendWhatsAppMessage(tenantId, contact.phone, media ? "" : finalText, media);

    const { data: waMessage } = await admin
      .from("whatsapp_messages")
      .insert({
        tenant_id: tenantId,
        contact_id: contactId,
        twilio_sid: result.externalId,
        direction: "outbound",
        from_number: result.from,
        to_number: result.to,
        body: finalText,
        status: result.initialStatus,
        sent_by: null,
        media_storage_path: mediaMeta?.storagePath ?? null,
        media_content_type: mediaMeta?.contentType ?? null,
        media_file_name: mediaMeta?.fileName ?? null,
      })
      .select("id")
      .single();

    await admin.from("activities").insert({
      tenant_id: tenantId,
      contact_id: contactId,
      type: "whatsapp",
      direction: "outbound",
      body: finalText,
      whatsapp_message_id: waMessage?.id ?? null,
    });

    // Tempo real: a resposta do SDR aparece no chat aberto do contato.
    publishChange(tenantId, "whatsapp_messages", "INSERT", contactId);
  } catch (err) {
    console.error("runSdrLeadTurn: falha ao enviar resposta via WhatsApp", err);
  }
}
