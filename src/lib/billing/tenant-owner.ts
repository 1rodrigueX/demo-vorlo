import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/** Busca o e-mail do dono (profile role=owner) de um tenant — usado pelos e-mails de cobrança. */
export async function getTenantOwnerEmail(
  admin: SupabaseClient<Database>,
  tenantId: string,
): Promise<string | null> {
  const { data: owner } = await admin
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("role", "owner")
    .maybeSingle();
  if (!owner) return null;

  const { data } = await admin.auth.admin.getUserById(owner.id);
  return data.user?.email ?? null;
}
