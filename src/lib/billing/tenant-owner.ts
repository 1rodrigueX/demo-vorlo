import "server-only";
import type { AdminClient } from "@/lib/supabase/admin";

/** Busca o e-mail do dono (profile role=owner) de um tenant — usado pelos e-mails de cobrança. */
export async function getTenantOwnerEmail(
  admin: AdminClient,
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
