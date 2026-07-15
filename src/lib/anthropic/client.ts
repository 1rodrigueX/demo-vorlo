import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const apiKey = (data?.credentials as { apiKey?: string } | null)?.apiKey;
  return apiKey || null;
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
