import "server-only";
import { randomBytes } from "crypto";
import type { createAdminClient } from "@/lib/supabase/admin";
import { isReservedSlug } from "@/lib/tenant/reserved-slugs";

type Admin = ReturnType<typeof createAdminClient>;

const DIACRITIC_MARKS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(DIACRITIC_MARKS_REGEX, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "empresa"
  );
}

/**
 * Cria um tenant do zero, SEM billing_plan_id (sem CRM) — pro dono de um
 * produto standalone (Transportadora, ERP) que nunca teve conta antes.
 * Extraído de provision-transportadora.ts pra ser reaproveitado por
 * provision-module.ts (ERP standalone segue o mesmo molde). Não faz
 * rollback do usuário se falhar no meio — quem chama decide o que fazer
 * com o erro (o pagamento já aconteceu, prefere reconciliação manual a
 * perder o registro de quem pagou).
 */
export async function createStandaloneTenant(
  admin: Admin,
  userId: string,
  companyName: string,
): Promise<{ tenantId: string; ownerFullName: string } | { error: string }> {
  const { data: userResult, error: userLookupError } = await admin.auth.admin.getUserById(userId);
  if (userLookupError || !userResult.user) {
    return { error: `Usuário do checkout não encontrado: ${userLookupError?.message ?? userId}` };
  }
  const user = userResult.user;
  const ownerFullName = (user.user_metadata?.full_name as string | undefined) || companyName || "Dono";

  const baseSlug = slugify(companyName || "empresa");
  let tenantId: string | null = null;
  let lastError: string | undefined;

  for (let attempt = 0; attempt < 5 && !tenantId; attempt++) {
    const slug =
      attempt === 0 && !isReservedSlug(baseSlug) ? baseSlug : `${baseSlug}-${randomBytes(2).toString("hex")}`;
    const { data: tenant, error } = await admin
      .from("tenants")
      .insert({ name: companyName || "Empresa", slug })
      .select("id")
      .single();

    if (tenant) {
      tenantId = tenant.id;
    } else if (error?.code === "23505") {
      lastError = error.message;
      continue;
    } else {
      return { error: `Não foi possível criar a empresa: ${error?.message ?? "erro desconhecido"}` };
    }
  }

  if (!tenantId) {
    return { error: `Não foi possível gerar um slug único: ${lastError ?? "erro desconhecido"}` };
  }

  const { error: updateUserError } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { tenant_id: tenantId, role: "owner" },
  });
  if (updateUserError) {
    return { error: `Não foi possível vincular o usuário ao tenant: ${updateUserError.message}` };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: user.id,
    full_name: ownerFullName,
    tenant_id: tenantId,
    role: "owner",
  });
  if (profileError) {
    return { error: `Empresa criada, mas o profile falhou: ${profileError.message}` };
  }

  return { tenantId, ownerFullName };
}
