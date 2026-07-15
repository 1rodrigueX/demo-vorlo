"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserDev } from "@/lib/auth/current-user";

export type ActionState = { error?: string } | null;

/**
 * Abre um CRM pro dev visualizar/gerenciar sem trocar de sessão — o dev
 * continua logado como ele mesmo (tag "Dev"), só passa a enxergar os dados
 * daquele tenant (ver current_tenant_id() na migration 0007). A navegação
 * pro /dashboard é feita no cliente (router.push) depois do sucesso, já que
 * redirect() dentro de uma action chamada fora de <form>/useActionState nem
 * sempre navega de forma confiável.
 */
export async function viewTenantAsDev(tenantId: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isCurrentUserDev())) {
    return { error: "Acesso restrito a devs da plataforma" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("dev_active_view")
    .upsert({ dev_id: user.id, tenant_id: tenantId, updated_at: new Date().toISOString() });

  if (error) {
    return { error: `Não foi possível abrir esse CRM: ${error.message}` };
  }

  return null;
}

/** Fecha a visualização atual (a navegação de volta pro /dev é feita no cliente). */
export async function exitDevView(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const admin = createAdminClient();
    await admin.from("dev_active_view").delete().eq("dev_id", user.id);
  }

  return null;
}
