import "server-only";
import type OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOpenAIClientForTenant, getTenantOpenAIApiKey } from "@/lib/openai/client";
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

/** Teto de PDFs enviados ao modelo por rodada. */
const MAX_PDF_FILES = 2;
/** PDF vai em base64 dentro do prompt; acima disso o custo/latência não compensa. */
const MAX_PDF_BYTES = 8 * 1024 * 1024;

type HistoryRow = {
  direction: string;
  body: string | null;
  media_storage_path: string | null;
  media_content_type: string | null;
  media_file_name: string | null;
};

/**
 * Monta as mensagens pro modelo a partir do histórico, agora com MÍDIA: a
 * imagem que o lead mandou vira bloco de visão (o SDR "vê"), e o áudio é
 * transcrito e entra como texto (o SDR "ouve"). Só a janela recente carrega a
 * mídia de fato; mais antigas viram um rótulo curto ("[imagem]"/"[áudio]").
 * Funde turnos consecutivos do mesmo papel (o lead pode mandar 3 seguidas).
 */
type ContentPart = OpenAI.Chat.Completions.ChatCompletionContentPart;
type Draft = { role: "user" | "assistant"; parts: ContentPart[] };

async function buildSdrMessages(
  history: HistoryRow[],
  speechKey: string | null,
): Promise<{
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  lastInboundWasAudio: boolean;
}> {
  const ordered = [...history].reverse(); // do mais antigo pro mais novo
  const drafts: Draft[] = [];
  let imagesUsed = 0;
  let pdfsUsed = 0;
  let lastInboundWasAudio = false;

  for (let idx = 0; idx < ordered.length; idx++) {
    const row = ordered[idx];
    const role: "user" | "assistant" = row.direction === "inbound" ? "user" : "assistant";
    const isRecent = idx >= ordered.length - MEDIA_WINDOW;
    const parts: ContentPart[] = [];

    const text = row.body?.trim() ?? "";
    const mime = row.media_content_type ?? "";
    const isImage = mime.startsWith("image/");
    const isAudio = mime.startsWith("audio/");
    const isPdf = mime === "application/pdf" || mime.startsWith("application/pdf");
    // Mídia só é "vista/ouvida" quando veio DO lead. Mídia de saída (ex.: o
    // próprio áudio TTS do SDR) entra só como o texto que já está salvo.
    const inboundMedia = role === "user" && !!row.media_storage_path;

    if (role === "user") lastInboundWasAudio = false;

    if (inboundMedia && isImage) {
      if (isRecent && imagesUsed < MAX_VISION_IMAGES) {
        const bytes = await getMessageAttachmentBytes(row.media_storage_path!);
        if (bytes) {
          // OpenAI recebe imagem como data URL (na Anthropic era um bloco
          // base64 com media_type separado).
          const mediaType = VISION_MEDIA_TYPES.has(mime) ? mime : "image/jpeg";
          parts.push({
            type: "image_url",
            image_url: { url: `data:${mediaType};base64,${bytes.toString("base64")}` },
          });
          imagesUsed++;
        }
      }
      if (text) parts.push({ type: "text", text });
      else if (!parts.length) parts.push({ type: "text", text: "[o lead enviou uma imagem]" });
    } else if (inboundMedia && isAudio) {
      lastInboundWasAudio = true;
      let transcript: string | null = null;
      if (isRecent) {
        const bytes = await getMessageAttachmentBytes(row.media_storage_path!);
        if (bytes) transcript = await transcribeAudio(bytes, mime || "audio/ogg", speechKey);
      }
      const spoken = transcript || text;
      parts.push({
        type: "text",
        text: spoken ? `[áudio do lead] ${spoken}` : "[o lead enviou um áudio que não pôde ser transcrito]",
      });
    } else if (inboundMedia && isPdf) {
      // PDF vai inteiro pro modelo (o GPT-5.6 lê arquivo nativamente, sem
      // precisar extrair texto antes) — é como o SDR "lê" um orçamento,
      // contrato ou tabela de preços que o lead mandou.
      if (isRecent && pdfsUsed < MAX_PDF_FILES) {
        const bytes = await getMessageAttachmentBytes(row.media_storage_path!);
        if (bytes && bytes.length <= MAX_PDF_BYTES) {
          parts.push({
            type: "file",
            file: {
              filename: row.media_file_name || "documento.pdf",
              file_data: `data:application/pdf;base64,${bytes.toString("base64")}`,
            },
          });
          pdfsUsed++;
        } else if (bytes) {
          parts.push({ type: "text", text: "[o lead enviou um PDF grande demais pra ler agora]" });
        }
      }
      if (text) parts.push({ type: "text", text });
      else if (!parts.length) parts.push({ type: "text", text: "[o lead enviou um PDF]" });
    } else if (inboundMedia) {
      parts.push({ type: "text", text: text ? `[arquivo] ${text}` : "[o lead enviou um arquivo]" });
    } else if (text) {
      parts.push({ type: "text", text });
    }

    if (!parts.length) continue;

    // Funde turnos consecutivos do mesmo papel (o lead pode mandar 3 seguidas).
    const prev = drafts[drafts.length - 1];
    if (prev && prev.role === role) prev.parts.push(...parts);
    else drafts.push({ role, parts });
  }

  // Começa por "user" — assistants iniciais sem pergunta antes não ajudam o modelo.
  while (drafts.length && drafts[0].role !== "user") drafts.shift();

  // Mensagem de assistant na OpenAI não aceita partes de imagem, só texto —
  // por isso o achatamento (na prática o SDR só manda texto mesmo).
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = drafts.map((d) =>
    d.role === "assistant"
      ? {
          role: "assistant" as const,
          content: d.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .filter(Boolean)
            .join("\n"),
        }
      : { role: "user" as const, content: d.parts },
  );

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

  let client: OpenAI;
  try {
    client = await getOpenAIClientForTenant(tenantId);
  } catch (err) {
    console.error("runSdrLeadTurn: OpenAI não configurada pro tenant", tenantId, err);
    return;
  }

  const { data: history } = await admin
    .from("whatsapp_messages")
    .select("direction, body, media_storage_path, media_content_type, media_file_name")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY);

  // Mesma chave da OpenAI do tenant banca ouvir (Whisper) e falar (TTS) —
  // sem env var separada, que na prática nunca era configurada.
  const speechKey = await getTenantOpenAIApiKey(tenantId);

  const { messages, lastInboundWasAudio } = await buildSdrMessages((history ?? []) as HistoryRow[], speechKey);

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
  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    COMPLETE_LEAD_REGISTRATION_TOOL,
    BUSCAR_PRODUTOS_ERP_TOOL,
    MONTAR_PROPOSTA_ERP_TOOL,
  ];
  if (company?.website) tools.push(SEARCH_COMPANY_WEBSITE_TOOL);
  if (company?.catalogNames.length) tools.push(SEND_CATALOG_TOOL);
  if (company?.hasProductPhotos) tools.push(SEND_PRODUCT_PHOTOS_TOOL);

  // System prompt vai como 1ª mensagem (na Anthropic era parâmetro separado).
  messages.unshift({ role: "system", content: system });

  let finalText = "";
  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await client.chat.completions.create({
        model: agent.model,
        // reasoning_effort OBRIGATORIAMENTE "none" aqui: o Chat Completions
        // recusa (400) combinar function tools com qualquer outro nível —
        // "Function tools with reasoning_effort are not supported ... set
        // reasoning_effort to 'none'". Toda chamada com `tools` neste projeto
        // segue essa regra. (Se um dia precisarmos de raciocínio COM
        // ferramentas, o caminho é migrar pra /v1/responses.)
        // Orçamento continua folgado por segurança — é teto, não reserva: só
        // se paga o que for gerado.
        max_completion_tokens: 2000,
        reasoning_effort: "none",
        tools,
        messages,
      });

      const choice = response.choices[0];
      const assistantMessage = choice?.message;
      if (!assistantMessage) break;

      finalText = (assistantMessage.content ?? "").trim();
      messages.push(assistantMessage);

      const toolCalls = assistantMessage.tool_calls ?? [];
      if (choice.finish_reason !== "tool_calls" || !toolCalls.length) break;

      for (const toolCall of toolCalls) {
        if (toolCall.type !== "function") continue;

        // Argumentos vêm como string JSON na OpenAI (na Anthropic já vinham
        // como objeto) — parse protegido contra JSON malformado do modelo.
        let args: Record<string, unknown> = {};
        try {
          args = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
        } catch {
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: "ERRO: argumentos inválidos (JSON malformado). Tente de novo com um JSON válido.",
          });
          continue;
        }

        const name = toolCall.function.name;
        let result: { content: string; isError: boolean };
        if (name === "search_company_website" && company?.website) {
          result = await executeSearchCompanyWebsite(admin, tenantId, company.website);
        } else if (name === "send_catalog") {
          const fileName = String((args as { file_name?: string }).file_name ?? "").trim();
          result = fileName
            ? await executeSendCatalog(admin, tenantId, contactId, contact.phone, fileName)
            : { content: "Informe o file_name exato do catálogo escolhido pelo lead.", isError: true };
        } else if (name === "send_product_photos") {
          result = await executeSendProductPhotos(admin, tenantId, contactId, contact.phone);
        } else if (name === "buscar_produtos_erp") {
          result = await executeBuscarProdutosErp(admin, tenantId, args);
        } else if (name === "montar_proposta_erp") {
          result = await executeMontarPropostaErp(admin, tenantId, contactId, contact.created_by, args);
        } else {
          result = await executeCompleteLeadRegistration(admin, tenantId, contactId, contact.created_by, args);
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result.isError ? `ERRO: ${result.content}` : result.content,
        });
      }
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
  if (lastInboundWasAudio && isSpeechEnabled(speechKey)) {
    try {
      const ogg = await synthesizeSpeech(finalText, speechKey);
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
