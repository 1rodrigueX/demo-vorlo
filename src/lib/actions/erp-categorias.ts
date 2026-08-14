"use server";

import { createClient } from "@/lib/supabase/server";
import { currentTenantContext, revalidateTenantPaths } from "@/lib/auth/current-user";
import { erpCategoriaSchema } from "@/lib/validation/erp-cadastros";
import type { ErpCategoria } from "@/types/domain";

export type ActionState = { error?: string } | null;

async function revalidateErpCadastros(supabase: Awaited<ReturnType<typeof createClient>>, tenantId: string) {
  await revalidateTenantPaths(supabase, tenantId, ["/erp/cadastros/categorias"]);
}

/** Confere que a categoria pai é do próprio tenant e que não forma ciclo (pai não pode ser
 * descendente de quem está sendo editado — senão a árvore de categorias vira um loop). */
async function validateOwnParent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  parentId: string | null,
  editingId: string | null,
): Promise<{ parentId: string | null; error?: string }> {
  if (!parentId) return { parentId: null };
  if (parentId === editingId) return { parentId: null, error: "Uma categoria não pode ser pai dela mesma" };

  // Sobe a cadeia de pais a partir do parentId escolhido — se bater no id que está sendo
  // editado, o pai proposto é descendente dele e formaria um ciclo.
  let cursor: string | null = parentId;
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const { data } = await supabase.from("erp_categorias").select("id, tenant_id, parent_id").eq("id", cursor).maybeSingle();
    if (!data || data.tenant_id !== tenantId) return { parentId: null, error: "Categoria pai inválida" };
    if (editingId && data.id === editingId) return { parentId: null, error: "Essa categoria pai criaria um ciclo" };
    cursor = data.parent_id;
  }
  return { parentId };
}

export async function getErpCategorias(): Promise<ErpCategoria[]> {
  const { supabase, tenantId } = await currentTenantContext();
  if (!tenantId) return [];
  const { data } = await supabase.from("erp_categorias").select("*").eq("tenant_id", tenantId).order("name");
  return data ?? [];
}

export async function createErpCategoria(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = erpCategoriaSchema.safeParse({
    name: formData.get("name"),
    parentId: formData.get("parentId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { supabase, user, tenantId } = await currentTenantContext();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: hasErp } = await supabase.rpc("current_tenant_has_erp", { p_user_id: user.id });
  if (!hasErp) return { error: "ERP não está ativo pra este tenant" };

  const parent = await validateOwnParent(supabase, tenantId, parsed.data.parentId || null, null);
  if (parent.error) return { error: parent.error };

  const { error } = await supabase.from("erp_categorias").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    parent_id: parent.parentId,
  });
  if (error) {
    const message = error.code === "23505" ? "Já existe uma categoria com esse nome" : error.message;
    return { error: `Não foi possível criar: ${message}` };
  }

  await revalidateErpCadastros(supabase, tenantId);
  return null;
}

export async function updateErpCategoria(id: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = erpCategoriaSchema.safeParse({
    name: formData.get("name"),
    parentId: formData.get("parentId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { supabase, user, tenantId } = await currentTenantContext();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: hasErp } = await supabase.rpc("current_tenant_has_erp", { p_user_id: user.id });
  if (!hasErp) return { error: "ERP não está ativo pra este tenant" };

  const parent = await validateOwnParent(supabase, tenantId, parsed.data.parentId || null, id);
  if (parent.error) return { error: parent.error };

  const { error } = await supabase
    .from("erp_categorias")
    .update({ name: parsed.data.name, parent_id: parent.parentId })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) {
    const message = error.code === "23505" ? "Já existe uma categoria com esse nome" : error.message;
    return { error: `Não foi possível salvar: ${message}` };
  }

  await revalidateErpCadastros(supabase, tenantId);
  return null;
}

export async function deleteErpCategoria(id: string): Promise<{ error?: string }> {
  const { supabase, user, tenantId } = await currentTenantContext();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: hasErp } = await supabase.rpc("current_tenant_has_erp", { p_user_id: user.id });
  if (!hasErp) return { error: "ERP não está ativo pra este tenant" };

  const { error } = await supabase.from("erp_categorias").delete().eq("id", id).eq("tenant_id", tenantId);
  if (error) return { error: `Não foi possível excluir: ${error.message}` };

  await revalidateErpCadastros(supabase, tenantId);
  return {};
}
