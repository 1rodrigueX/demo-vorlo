"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserDev } from "@/lib/auth/current-user";
import { saveOpenAiKeySchema } from "@/lib/validation/tenant-integration";
import { testOpenAIApiKey } from "@/lib/openai/client";
import { getPlatformAiConfig, type PlatformAiConfig } from "@/lib/openai/platformConfig";
import { encryptSecret, decryptSecret } from "@/lib/crypto/secrets";

export type ActionState = { error?: string } | null;

/** Config mascarada pra tela /dev/ia — null se quem está olhando não é dev. */
export async function getPlatformAiConfigForForm(): Promise<PlatformAiConfig | null> {
  if (!(await isCurrentUserDev())) return null;
  return getPlatformAiConfig();
}

export async function savePlatformAiConfig(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isCurrentUserDev())) {
    return { error: "Acesso restrito a devs da plataforma" };
  }

  const parsed = saveOpenAiKeySchema.safeParse({ apiKey: formData.get("apiKey") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const test = await testOpenAIApiKey(parsed.data.apiKey);
  const now = new Date().toISOString();
  const admin = createAdminClient();

  const { error } = await admin.from("platform_ai_config").upsert(
    {
      id: true,
      // Cifrada em repouso (AES-256-GCM) — no-op se SECRETS_ENC_KEY não
      // estiver configurada (texto puro nesse caso, ver src/lib/crypto/secrets.ts).
      openai_api_key: encryptSecret(parsed.data.apiKey),
      status: test.ok ? ("connected" as const) : ("error" as const),
      connected_at: test.ok ? now : null,
      last_tested_at: now,
      last_error: test.ok ? null : test.error,
      updated_at: now,
    },
    { onConflict: "id" },
  );

  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  revalidatePath("/dev/ia");
  if (!test.ok) return { error: `Chave salva, mas o teste de conexão falhou: ${test.error}` };
  return null;
}

export async function testPlatformAiConnection(): Promise<ActionState> {
  if (!(await isCurrentUserDev())) {
    return { error: "Acesso restrito a devs da plataforma" };
  }

  const admin = createAdminClient();
  const { data } = await admin.from("platform_ai_config").select("openai_api_key").eq("id", true).maybeSingle();

  const stored = data?.openai_api_key;
  if (!stored) return { error: "Nenhuma chave salva ainda" };
  let apiKey: string | null;
  try {
    apiKey = decryptSecret(stored);
  } catch {
    return { error: "Não foi possível ler a chave salva (verifique SECRETS_ENC_KEY)" };
  }
  if (!apiKey) return { error: "Nenhuma chave salva ainda" };

  const test = await testOpenAIApiKey(apiKey);
  const now = new Date().toISOString();

  await admin
    .from("platform_ai_config")
    .update({
      status: test.ok ? "connected" : "error",
      ...(test.ok ? { connected_at: now } : {}),
      last_tested_at: now,
      last_error: test.ok ? null : test.error,
    })
    .eq("id", true);

  revalidatePath("/dev/ia");
  if (!test.ok) return { error: `Teste de conexão falhou: ${test.error}` };
  return null;
}

export async function disconnectPlatformAiConfig(): Promise<ActionState> {
  if (!(await isCurrentUserDev())) {
    return { error: "Acesso restrito a devs da plataforma" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("platform_ai_config").delete().eq("id", true);
  if (error) return { error: "Não foi possível desconectar" };

  revalidatePath("/dev/ia");
  return null;
}
