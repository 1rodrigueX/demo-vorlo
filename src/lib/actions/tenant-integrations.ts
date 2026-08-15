"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { saveOpenAiKeySchema } from "@/lib/validation/tenant-integration";
import { testOpenAIApiKey } from "@/lib/openai/client";
import { encryptSecret, decryptSecret } from "@/lib/crypto/secrets";

export type ActionState = { error?: string } | null;

export async function saveOpenAiKey(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = saveOpenAiKeySchema.safeParse({
    apiKey: formData.get("apiKey"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const test = await testOpenAIApiKey(parsed.data.apiKey);
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("tenant_integrations")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("provider", "openai")
    .maybeSingle();

  const payload = {
    tenant_id: tenantId,
    provider: "openai" as const,
    // Chave cifrada em repouso (AES-256-GCM). No-op se SECRETS_ENC_KEY não
    // estiver configurada — nesse caso segue texto puro, sem quebrar nada.
    credentials: { apiKey: encryptSecret(parsed.data.apiKey) },
    status: test.ok ? ("connected" as const) : ("error" as const),
    connected_at: test.ok ? now : null,
    last_tested_at: now,
    last_error: test.ok ? null : test.error,
    updated_at: now,
  };

  const { error } = existing
    ? await supabase.from("tenant_integrations").update(payload).eq("id", existing.id)
    : await supabase.from("tenant_integrations").insert(payload);

  if (error) {
    console.error("saveOpenAiKey failed:", error);
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/[tenantSlug]/settings/integracoes", "page");

  if (!test.ok) {
    return { error: `Chave salva, mas o teste de conexão falhou: ${test.error}` };
  }

  return null;
}

export async function testOpenAiConnection(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: integration } = await supabase
    .from("tenant_integrations")
    .select("credentials")
    .eq("tenant_id", tenantId)
    .eq("provider", "openai")
    .maybeSingle();

  const stored = (integration?.credentials as { apiKey?: string } | null)?.apiKey;
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

  await supabase
    .from("tenant_integrations")
    .update({
      status: test.ok ? "connected" : "error",
      ...(test.ok ? { connected_at: now } : {}),
      last_tested_at: now,
      last_error: test.ok ? null : test.error,
    })
    .eq("tenant_id", tenantId)
    .eq("provider", "openai");

  revalidatePath("/[tenantSlug]/settings/integracoes", "page");

  if (!test.ok) return { error: `Teste de conexão falhou: ${test.error}` };
  return null;
}

export async function disconnectOAuthIntegration(provider: "gmail" | "outlook"): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { error } = await supabase
    .from("tenant_integrations")
    .update({ status: "disconnected", access_token: null, refresh_token: null, expires_at: null, connected_at: null })
    .eq("tenant_id", tenantId)
    .eq("provider", provider);

  if (error) return { error: "Não foi possível desconectar" };

  revalidatePath("/[tenantSlug]/settings/integracoes", "page");
  return null;
}

export async function disconnectOpenAiKey(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { error } = await supabase
    .from("tenant_integrations")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("provider", "openai");

  if (error) return { error: "Não foi possível desconectar" };

  revalidatePath("/[tenantSlug]/settings/integracoes", "page");
  return null;
}
