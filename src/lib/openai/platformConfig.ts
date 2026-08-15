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
  return `sk-...${tail}`;
}

/** Config completa (mascarada) pra tela /dev/ia. */
export async function getPlatformAiConfig(): Promise<PlatformAiConfig> {
  const admin = createAdminClient();
  const { data } = await admin.from("platform_ai_config").select("*").eq("id", true).maybeSingle();

  let apiKeyPreview: string | null = null;
  if (data?.openai_api_key) {
    try {
      const decrypted = decryptSecret(data.openai_api_key);
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
 * Chave que banca o Vorlo (aba Suporte) em todo tenant. Prioriza o banco
 * (editável em /dev/ia sem redeploy); PLATFORM_OPENAI_API_KEY (env var)
 * continua funcionando como fallback.
 */
export async function getPlatformOpenAIApiKey(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("platform_ai_config")
    .select("openai_api_key, status")
    .eq("id", true)
    .maybeSingle();

  if (data?.status === "connected" && data.openai_api_key) {
    try {
      const decrypted = decryptSecret(data.openai_api_key);
      if (decrypted) return decrypted;
    } catch (err) {
      console.error("getPlatformOpenAIApiKey: falha ao descriptografar a chave", err);
    }
  }

  return process.env.PLATFORM_OPENAI_API_KEY || null;
}
