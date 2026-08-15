import "server-only";
import type OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchWebsiteText } from "@/lib/ai-agents/websiteFetch";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const SEARCH_COMPANY_WEBSITE_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "search_company_website",
    description:
      "Consulta o site oficial da empresa pra pegar informações reais de produtos, serviços ou preços antes de " +
      "responder o lead. Use sempre que a pessoa perguntar algo específico sobre o que a empresa vende e você não " +
      "tiver certeza — nunca invente detalhes de produto sem checar aqui primeiro.",
    parameters: { type: "object", properties: {} },
  },
};

type Admin = ReturnType<typeof createAdminClient>;

export async function executeSearchCompanyWebsite(
  admin: Admin,
  tenantId: string,
  website: string,
): Promise<{ content: string; isError: boolean }> {
  const { data: profile } = await admin
    .from("tenant_company_profile")
    .select("website_content, website_fetched_at")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const isFresh =
    !!profile?.website_fetched_at &&
    Date.now() - new Date(profile.website_fetched_at).getTime() < CACHE_TTL_MS;

  if (isFresh && profile?.website_content) {
    return { content: profile.website_content, isError: false };
  }

  const result = await fetchWebsiteText(website);

  if ("error" in result) {
    if (profile?.website_content) {
      return { content: profile.website_content, isError: false };
    }
    return { content: `Não foi possível consultar o site agora: ${result.error}`, isError: true };
  }

  await admin
    .from("tenant_company_profile")
    .update({ website_content: result.text, website_fetched_at: new Date().toISOString() })
    .eq("tenant_id", tenantId);

  return { content: result.text, isError: false };
}
