import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto/secrets";
import { getPlatformAnthropicApiKey } from "@/lib/anthropic/platformConfig";

export const ASSISTANT_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

export class AnthropicNotConfiguredError extends Error {
  constructor() {
    super("Este CRM ainda não conectou uma chave da API Anthropic (Configurações > Inteligência Artificial)");
    this.name = "AnthropicNotConfiguredError";
  }
}

async function getTenantAnthropicApiKey(tenantId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_integrations")
    .select("credentials, status")
    .eq("tenant_id", tenantId)
    .eq("provider", "anthropic")
    .maybeSingle();

  if (data?.status !== "connected") return null;
  const stored = (data?.credentials as { apiKey?: string } | null)?.apiKey;
  if (!stored) return null;
  try {
    return decryptSecret(stored) || null;
  } catch (err) {
    console.error("getTenantAnthropicApiKey: falha ao descriptografar a chave", err);
    return null;
  }
}

/**
 * Client Anthropic autenticado com a chave própria do tenant (BYO key, igual
 * ao modelo do Bling) — cada empresa paga/usa a própria conta Anthropic.
 * Usa admin client pra ler a credencial porque select em tenant_integrations
 * é admin-only via RLS, mas qualquer membro do time pode conversar com os
 * agentes (mesma lógica de src/lib/bling/client.ts pro token do Bling).
 */
export async function getAnthropicClientForTenant(tenantId: string): Promise<Anthropic> {
  const apiKey = await getTenantAnthropicApiKey(tenantId);
  if (!apiKey) throw new AnthropicNotConfiguredError();
  return new Anthropic({ apiKey });
}

/**
 * O Vorlo (aba Suporte) é SEMPRE bancado pela chave da plataforma (editável
 * em /dev/ia, ver platformConfig.ts) — mesmo que o tenant tenha conectado a
 * própria chave pra usar outros agentes. Suporte é o canal com o dono da
 * plataforma; não faz sentido esse custo cair na conta Anthropic do cliente.
 * Os demais tipos de agente (SDR, atendente etc.) são o oposto: SEMPRE a
 * chave do próprio tenant, sem fallback nenhum pra plataforma — são quem
 * atende os clientes DELE, o custo é dele.
 */
export async function getAnthropicClientForAgent(
  tenantId: string,
  agent: { is_fala_ai: boolean },
): Promise<Anthropic> {
  if (agent.is_fala_ai) {
    const platformKey = await getPlatformAnthropicApiKey();
    if (!platformKey) throw new AnthropicNotConfiguredError();
    return new Anthropic({ apiKey: platformKey });
  }

  const tenantKey = await getTenantAnthropicApiKey(tenantId);
  if (!tenantKey) throw new AnthropicNotConfiguredError();
  return new Anthropic({ apiKey: tenantKey });
}

/**
 * Client Anthropic da PLATAFORMA (Vorlo), não de um tenant. Usa a chave
 * configurada em /dev/ia (com fallback pra PLATFORM_ANTHROPIC_API_KEY, env
 * var, pra quem configurou assim antes dessa tela existir). Uso interno do
 * time (ex.: redigir comunicado de atualização no painel dev), nunca custo
 * do cliente. Lança AnthropicNotConfiguredError se não houver chave.
 */
export async function getPlatformAnthropicClient(): Promise<Anthropic> {
  const apiKey = await getPlatformAnthropicApiKey();
  if (!apiKey) throw new AnthropicNotConfiguredError();
  return new Anthropic({ apiKey });
}

/** Faz uma chamada mínima real à API pra confirmar que a chave funciona. */
export async function testAnthropicApiKey(
  apiKey: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model: ASSISTANT_MODEL,
      max_tokens: 1,
      messages: [{ role: "user", content: "oi" }],
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha desconhecida ao testar a chave";
    return { ok: false, error: message };
  }
}
