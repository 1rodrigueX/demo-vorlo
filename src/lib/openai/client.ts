import "server-only";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto/secrets";
import { getPlatformOpenAIApiKey } from "@/lib/openai/platformConfig";

/**
 * Camada de acesso à OpenAI (substituiu a Anthropic — ver migration 0088).
 *
 * gpt-5.6-terra é o padrão: da família GPT-5.6, é o nível "equilibrado" —
 * suporta tudo que o CRM usa (function calling, tool calls em paralelo,
 * visão pra ler imagem que o lead manda, structured output) por ~metade do
 * preço do topo de linha (sol). Trocável por OPENAI_MODEL sem deploy de
 * código, e por agente via ai_agents.model.
 */
export const ASSISTANT_MODEL = process.env.OPENAI_MODEL || "gpt-5.6-terra";

export class OpenAINotConfiguredError extends Error {
  constructor() {
    super("Este CRM ainda não conectou uma chave da API da OpenAI (Configurações > Inteligência Artificial)");
    this.name = "OpenAINotConfiguredError";
  }
}

async function getTenantOpenAIApiKey(tenantId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_integrations")
    .select("credentials, status")
    .eq("tenant_id", tenantId)
    .eq("provider", "openai")
    .maybeSingle();

  if (data?.status !== "connected") return null;
  const stored = (data?.credentials as { apiKey?: string } | null)?.apiKey;
  if (!stored) return null;
  try {
    return decryptSecret(stored) || null;
  } catch (err) {
    console.error("getTenantOpenAIApiKey: falha ao descriptografar a chave", err);
    return null;
  }
}

/**
 * Client autenticado com a chave própria do tenant (BYO key, igual ao modelo
 * do Bling) — cada empresa paga/usa a própria conta OpenAI. Usa admin client
 * pra ler a credencial porque select em tenant_integrations é admin-only via
 * RLS, mas qualquer membro do time pode conversar com os agentes.
 */
export async function getOpenAIClientForTenant(tenantId: string): Promise<OpenAI> {
  const apiKey = await getTenantOpenAIApiKey(tenantId);
  if (!apiKey) throw new OpenAINotConfiguredError();
  return new OpenAI({ apiKey });
}

/**
 * O Vorlo (aba Suporte) é SEMPRE bancado pela chave da plataforma (editável
 * em /dev/ia) — mesmo que o tenant tenha conectado a própria chave pra usar
 * outros agentes. Suporte é o canal com o dono da plataforma; não faz sentido
 * esse custo cair na conta do cliente. Os demais tipos de agente (SDR,
 * atendente etc.) são o oposto: SEMPRE a chave do próprio tenant, sem
 * fallback nenhum — são quem atende os clientes DELE, o custo é dele.
 */
export async function getOpenAIClientForAgent(
  tenantId: string,
  agent: { is_fala_ai: boolean },
): Promise<OpenAI> {
  if (agent.is_fala_ai) {
    const platformKey = await getPlatformOpenAIApiKey();
    if (!platformKey) throw new OpenAINotConfiguredError();
    return new OpenAI({ apiKey: platformKey });
  }

  const tenantKey = await getTenantOpenAIApiKey(tenantId);
  if (!tenantKey) throw new OpenAINotConfiguredError();
  return new OpenAI({ apiKey: tenantKey });
}

/**
 * Client da PLATAFORMA (Vorlo), não de um tenant. Usa a chave configurada em
 * /dev/ia (com fallback pra PLATFORM_OPENAI_API_KEY). Uso interno do time
 * (ex.: redigir comunicado no painel dev), nunca custo do cliente.
 */
export async function getPlatformOpenAIClient(): Promise<OpenAI> {
  const apiKey = await getPlatformOpenAIApiKey();
  if (!apiKey) throw new OpenAINotConfiguredError();
  return new OpenAI({ apiKey });
}

/**
 * Faz uma chamada mínima real à API pra confirmar que a chave funciona.
 *
 * `reasoning_effort: "none"` + orçamento pequeno de propósito: o GPT-5.6 é um
 * modelo de raciocínio e gasta tokens "pensando" ANTES de escrever. Com
 * max_completion_tokens muito baixo (tínhamos 1, herdado do teste da
 * Anthropic) o orçamento acaba no raciocínio e a API devolve 400 "output
 * limit was reached" — que parece erro de chave, mas não é: a chave até
 * autenticou. Desligar o raciocínio deixa o teste barato, rápido e honesto
 * (o que ele precisa provar é só que a chave autentica).
 */
export async function testOpenAIApiKey(
  apiKey: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const client = new OpenAI({ apiKey });
    await client.chat.completions.create({
      model: ASSISTANT_MODEL,
      max_completion_tokens: 16,
      reasoning_effort: "none",
      messages: [{ role: "user", content: "oi" }],
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha desconhecida ao testar a chave";
    return { ok: false, error: message };
  }
}
