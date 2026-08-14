import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto/secrets";

export type PlatformAiConfig = {
  apiKeyPreview: string | null;
  status: "disconnected" | "connected" | "error";
  connectedAt: string | null;
  lastTestedAt: string | null;
  lastError: string | null;
};

function maskApiKey(apiKey: string): string {
  const tail = apiKey.slice(-4);
  return `sk-ant-...${tail}`;
}

/** Config completa (mascarada) pra tela /dev/ia. */
export async function getPlatformAiConfig(): Promise<PlatformAiConfig> {
  const admin = createAdminClient();
  const { data } = await admin.from("platform_ai_config").select("*").eq("id", true).maybeSingle();

  let apiKeyPreview: string | null = null;
  if (data?.anthropic_api_key) {
    try {
      const decrypted = decryptSecret(data.anthropic_api_key);
      if (decrypted) apiKeyPreview = maskApiKey(decrypted);
    } catch {
      apiKeyPreview = null;
    }
  }

  return {
    apiKeyPreview,
    status: data?.status ?? "disconnected",
    connectedAt: data?.connected_at ?? null,
    lastTestedAt: data?.last_tested_at ?? null,
    lastError: data?.last_error ?? null,
  };
}

/**
 * Chave que banca o Vorlo (aba Suporte) em todo tenant — a mesma que testAnthropicApiKey
 * confere antes de salvar em /dev/ia. Prioriza o banco (editável sem redeploy);
 * PLATFORM_ANTHROPIC_API_KEY (env var) continua funcionando como fallback pra
 * quem já tinha configurado assim antes dessa tela existir.
 */
export async function getPlatformAnthropicApiKey(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("platform_ai_config")
    .select("anthropic_api_key, status")
    .eq("id", true)
    .maybeSingle();

  if (data?.status === "connected" && data.anthropic_api_key) {
    try {
      const decrypted = decryptSecret(data.anthropic_api_key);
      if (decrypted) return decrypted;
    } catch (err) {
      console.error("getPlatformAnthropicApiKey: falha ao descriptografar a chave", err);
    }
  }

  return process.env.PLATFORM_ANTHROPIC_API_KEY || null;
}
