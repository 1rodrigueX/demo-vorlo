import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto/secrets";

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
 * Igual a getAnthropicClientForTenant, mas com fallback pra chave da
 * plataforma (PLATFORM_ANTHROPIC_API_KEY) quando o agente é o Vorlo e o
 * tenant não conectou a própria chave — o Vorlo funciona out-of-the-box em
 * todo CRM, sem custo pro tenant. Outros tipos de agente (SDR etc.) exigem a
 * chave do próprio tenant, sem fallback, pra não gerar custo de negócio do
 * cliente na conta da plataforma.
 */
export async function getAnthropicClientForAgent(
  tenantId: string,
  agent: { is_fala_ai: boolean },
): Promise<Anthropic> {
  const tenantKey = await getTenantAnthropicApiKey(tenantId);
  if (tenantKey) return new Anthropic({ apiKey: tenantKey });

  if (agent.is_fala_ai && process.env.PLATFORM_ANTHROPIC_API_KEY) {
    return new Anthropic({ apiKey: process.env.PLATFORM_ANTHROPIC_API_KEY });
  }

  throw new AnthropicNotConfiguredError();
}

/**
 * Client Anthropic da PLATAFORMA (Vorlo), não de um tenant. Usa a chave
 * PLATFORM_ANTHROPIC_API_KEY — a mesma que banca o agente Vorlo out-of-the-box.
 * Uso interno do time (ex.: redigir comunicado de atualização no painel dev),
 * nunca custo do cliente. Lança AnthropicNotConfiguredError se não houver chave.
 */
export function getPlatformAnthropicClient(): Anthropic {
  const apiKey = process.env.PLATFORM_ANTHROPIC_API_KEY;
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
