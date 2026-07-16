import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClientForTenant } from "@/lib/anthropic/client";
import { buildSdrLeadPrompt, type CompanyProfileContext } from "@/lib/ai-agents/sdrLeadPrompt";
import { COMPLETE_LEAD_REGISTRATION_TOOL, executeCompleteLeadRegistration } from "@/lib/ai-agents/sdrLeadTool";
import { SEARCH_COMPANY_WEBSITE_TOOL, executeSearchCompanyWebsite } from "@/lib/ai-agents/companyWebsiteTool";
import { SEND_CATALOG_TOOL, executeSendCatalog } from "@/lib/ai-agents/sendCatalogTool";
import { SEND_PRODUCT_PHOTOS_TOOL, executeSendProductPhotos } from "@/lib/ai-agents/sendProductPhotosTool";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";

const MAX_HISTORY = 20;
const MAX_TOOL_ITERATIONS = 4;

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

  let client: Anthropic;
  try {
    client = await getAnthropicClientForTenant(tenantId);
  } catch (err) {
    console.error("runSdrLeadTurn: Anthropic não configurado pro tenant", tenantId, err);
    return;
  }

  const { data: history } = await admin
    .from("whatsapp_messages")
    .select("direction, body")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY);

  const messages: Anthropic.MessageParam[] = (history ?? [])
    .reverse()
    .filter((m) => m.body?.trim())
    .map((m) => ({ role: m.direction === "inbound" ? "user" : "assistant", content: m.body as string }));

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
  const tools: Anthropic.Tool[] = [COMPLETE_LEAD_REGISTRATION_TOOL];
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

  try {
    const result = await sendWhatsAppMessage(tenantId, contact.phone, finalText);

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
  } catch (err) {
    console.error("runSdrLeadTurn: falha ao enviar resposta via WhatsApp", err);
  }
}
