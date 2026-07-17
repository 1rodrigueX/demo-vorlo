"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { createApiKeySchema } from "@/lib/validation/api-keys";
import { generateApiKey, hashApiKey } from "@/lib/reports/apiKeyHash";

export type CreateApiKeyState = { error?: string; rawKey?: string } | null;

export async function createApiKey(
  _prevState: CreateApiKeyState,
  formData: FormData,
): Promise<CreateApiKeyState> {
  const parsed = createApiKeySchema.safeParse({ name: formData.get("name") });
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

  const { rawKey, prefix } = generateApiKey();

  const { error } = await supabase.from("tenant_api_keys").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    key_prefix: prefix,
    key_hash: hashApiKey(rawKey),
    created_by: user.id,
  });

  if (error) {
    return { error: `Não foi possível criar a chave: ${error.message}` };
  }

  revalidatePath("/[tenantSlug]/dashboard", "page");
  return { rawKey };
}

export async function revokeApiKey(keyId: string) {
  const supabase = await createClient();
  await supabase.from("tenant_api_keys").delete().eq("id", keyId);
  revalidatePath("/[tenantSlug]/dashboard", "page");
}
