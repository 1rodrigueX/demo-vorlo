import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashApiKey } from "@/lib/reports/apiKeyHash";

/** Valida o header `Authorization: Bearer <chave>` usado pelo Power BI (ou qualquer outra ferramenta de BI) contra tenant_api_keys. */
export async function authenticateReportRequest(request: Request): Promise<{ tenantId: string } | null> {
  const auth = request.headers.get("authorization") ?? "";
  const rawKey = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!rawKey) return null;

  const admin = createAdminClient();
  const keyHash = hashApiKey(rawKey);
  const { data: apiKey } = await admin
    .from("tenant_api_keys")
    .select("id, tenant_id")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (!apiKey) return null;

  await admin.from("tenant_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", apiKey.id);

  return { tenantId: apiKey.tenant_id };
}
