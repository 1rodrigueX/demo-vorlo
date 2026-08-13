"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId, getTenantSlug } from "@/lib/auth/current-user";
import { erpCategoriaSchema } from "@/lib/validation/erp-cadastros";
import type { ErpCategoria } from "@/types/domain";

export type ActionState = { error?: string } | null;

async function currentTenant() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, tenantId: null };
  const tenantId = await requireTenantId(supabase, user.id);
  return { supabase, user, tenantId };
}

async function revalidateErpCadastros(supabase: Awaited<ReturnType<typeof createClient>>, tenantId: string) {
  const slug = await getTenantSlug(supabase, tenantId);
  if (slug) revalidatePath(`/${slug}/erp/cadastros/categorias`);
}

export async function getErpCategorias(): Promise<ErpCategoria[]> {
  const { supabase, tenantId } = await currentTenant();
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

  const { supabase, user, tenantId } = await currentTenant();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: hasErp } = await supabase.rpc("current_tenant_has_erp", { p_user_id: user.id });
  if (!hasErp) return { error: "ERP não está ativo pra este tenant" };

  const { error } = await supabase.from("erp_categorias").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    parent_id: parsed.data.parentId || null,
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

  const { supabase, tenantId } = await currentTenant();
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { error } = await supabase
    .from("erp_categorias")
    .update({ name: parsed.data.name, parent_id: parsed.data.parentId || null })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) {
    const message = error.code === "23505" ? "Já existe uma categoria com esse nome" : error.message;
    return { error: `Não foi possível salvar: ${message}` };
  }

  await revalidateErpCadastros(supabase, tenantId);
  return null;
}

export async function deleteErpCategoria(id: string) {
  const { supabase, tenantId } = await currentTenant();
  if (!tenantId) return;
  await supabase.from("erp_categorias").delete().eq("id", id).eq("tenant_id", tenantId);
  await revalidateErpCadastros(supabase, tenantId);
}
