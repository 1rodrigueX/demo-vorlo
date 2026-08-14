"use server";

import { createClient } from "@/lib/supabase/server";
import { currentTenantContext, revalidateTenantPaths } from "@/lib/auth/current-user";
import { erpFornecedorSchema } from "@/lib/validation/erp-cadastros";
import type { ErpFornecedor } from "@/types/domain";

export type ActionState = { error?: string } | null;

async function revalidateErpCadastros(supabase: Awaited<ReturnType<typeof createClient>>, tenantId: string) {
  await revalidateTenantPaths(supabase, tenantId, ["/erp/cadastros/fornecedores", "/erp/compras/pedidos"]);
}

export async function getErpFornecedores(): Promise<ErpFornecedor[]> {
  const { supabase, tenantId } = await currentTenantContext();
  if (!tenantId) return [];
  const { data } = await supabase.from("erp_fornecedores").select("*").eq("tenant_id", tenantId).order("name");
  return data ?? [];
}

export async function createErpFornecedor(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = erpFornecedorSchema.safeParse({
    name: formData.get("name"),
    document: formData.get("document"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    state: formData.get("state"),
    category: formData.get("category"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { supabase, user, tenantId } = await currentTenantContext();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: hasErp } = await supabase.rpc("current_tenant_has_erp", { p_user_id: user.id });
  if (!hasErp) return { error: "ERP não está ativo pra este tenant" };

  const { error } = await supabase.from("erp_fornecedores").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    document: parsed.data.document || null,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    city: parsed.data.city || null,
    state: parsed.data.state || null,
    category: parsed.data.category || null,
  });
  if (error) {
    const message = error.code === "23505" ? "Já existe um fornecedor com esse nome" : error.message;
    return { error: `Não foi possível criar: ${message}` };
  }

  await revalidateErpCadastros(supabase, tenantId);
  return null;
}

export async function updateErpFornecedor(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = erpFornecedorSchema.safeParse({
    name: formData.get("name"),
    document: formData.get("document"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    state: formData.get("state"),
    category: formData.get("category"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { supabase, user, tenantId } = await currentTenantContext();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: hasErp } = await supabase.rpc("current_tenant_has_erp", { p_user_id: user.id });
  if (!hasErp) return { error: "ERP não está ativo pra este tenant" };

  const { error } = await supabase
    .from("erp_fornecedores")
    .update({
      name: parsed.data.name,
      document: parsed.data.document || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      category: parsed.data.category || null,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) {
    const message = error.code === "23505" ? "Já existe um fornecedor com esse nome" : error.message;
    return { error: `Não foi possível salvar: ${message}` };
  }

  await revalidateErpCadastros(supabase, tenantId);
  return null;
}

export async function deleteErpFornecedor(id: string): Promise<{ error?: string }> {
  const { supabase, user, tenantId } = await currentTenantContext();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: hasErp } = await supabase.rpc("current_tenant_has_erp", { p_user_id: user.id });
  if (!hasErp) return { error: "ERP não está ativo pra este tenant" };

  const { error } = await supabase.from("erp_fornecedores").delete().eq("id", id).eq("tenant_id", tenantId);
  if (error) return { error: `Não foi possível excluir: ${error.message}` };

  await revalidateErpCadastros(supabase, tenantId);
  return {};
}
