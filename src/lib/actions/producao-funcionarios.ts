"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantId, getTenantSlug } from "@/lib/auth/current-user";
import { funcionarioSchema } from "@/lib/validation/producao-funcionario";
import type { ProducaoFuncionario } from "@/types/domain";

export type ActionState = { error?: string } | null;

export async function getFuncionarios(): Promise<ProducaoFuncionario[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return [];

  const { data } = await supabase
    .from("producao_funcionarios")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("full_name");

  return data ?? [];
}

/**
 * Cria a conta de login do funcionário. De propósito NÃO passa tenant_id
 * no user_metadata — isso impede o trigger handle_new_user de criar uma
 * linha em profiles pra ele (ver comentário na migration 0057), o que é o
 * que garante que ele não herda acesso a CRM/Financeiro/Transportadora/
 * Estoque do tenant. O vínculo com o tenant fica só em producao_funcionarios.
 */
export async function createFuncionario(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = funcionarioSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    turnoId: formData.get("turnoId"),
    maquinaId: formData.get("maquinaId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: hasProducao } = await supabase.rpc("current_tenant_has_producao");
  if (!hasProducao) return { error: "Produção não está ativa" };

  const admin = createAdminClient();
  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.fullName,
      producao_funcionario: true,
    },
  });
  if (userError || !created.user) {
    return { error: `Não foi possível criar o acesso: ${userError?.message ?? "erro desconhecido"}` };
  }

  const { error: insertError } = await admin.from("producao_funcionarios").insert({
    id: created.user.id,
    tenant_id: tenantId,
    full_name: parsed.data.fullName,
    turno_id: parsed.data.turnoId || null,
    maquina_id: parsed.data.maquinaId || null,
  });
  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: `Não foi possível vincular o funcionário: ${insertError.message}` };
  }

  const slug = await getTenantSlug(supabase, tenantId);
  if (slug) revalidatePath(`/${slug}/producao/configuracoes`);
  return null;
}

export async function updateFuncionarioAssignment(
  id: string,
  turnoId: string | null,
  maquinaId: string | null,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { error } = await supabase
    .from("producao_funcionarios")
    .update({ turno_id: turnoId, maquina_id: maquinaId })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) return { error: error.message };

  const slug = await getTenantSlug(supabase, tenantId);
  if (slug) revalidatePath(`/${slug}/producao/configuracoes`);
  return null;
}

export async function deleteFuncionario(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return;

  const { error } = await supabase.from("producao_funcionarios").delete().eq("id", id).eq("tenant_id", tenantId);
  if (!error) {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(id);
  }

  const slug = await getTenantSlug(supabase, tenantId);
  if (slug) revalidatePath(`/${slug}/producao/configuracoes`);
}
