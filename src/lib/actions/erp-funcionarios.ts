"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId, getTenantSlug } from "@/lib/auth/current-user";
import { erpFuncionarioSchema } from "@/lib/validation/erp-cadastros";
import type { ErpFuncionario } from "@/types/domain";

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
  if (slug) revalidatePath(`/${slug}/erp/cadastros/funcionarios`);
}

export async function getErpFuncionarios(): Promise<ErpFuncionario[]> {
  const { supabase, tenantId } = await currentTenant();
  if (!tenantId) return [];
  const { data } = await supabase.from("erp_funcionarios").select("*").eq("tenant_id", tenantId).order("full_name");
  return data ?? [];
}

export async function createErpFuncionario(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = erpFuncionarioSchema.safeParse({
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    department: formData.get("department"),
    admissionDate: formData.get("admissionDate"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { supabase, user, tenantId } = await currentTenant();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: hasErp } = await supabase.rpc("current_tenant_has_erp", { p_user_id: user.id });
  if (!hasErp) return { error: "ERP não está ativo pra este tenant" };

  const { error } = await supabase.from("erp_funcionarios").insert({
    tenant_id: tenantId,
    full_name: parsed.data.fullName,
    role: parsed.data.role || null,
    department: parsed.data.department || null,
    admission_date: parsed.data.admissionDate || null,
  });
  if (error) {
    return { error: `Não foi possível criar: ${error.message}` };
  }

  await revalidateErpCadastros(supabase, tenantId);
  return null;
}

export async function updateErpFuncionario(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = erpFuncionarioSchema.safeParse({
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    department: formData.get("department"),
    admissionDate: formData.get("admissionDate"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { supabase, tenantId } = await currentTenant();
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { error } = await supabase
    .from("erp_funcionarios")
    .update({
      full_name: parsed.data.fullName,
      role: parsed.data.role || null,
      department: parsed.data.department || null,
      admission_date: parsed.data.admissionDate || null,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) {
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  await revalidateErpCadastros(supabase, tenantId);
  return null;
}

export async function deleteErpFuncionario(id: string) {
  const { supabase, tenantId } = await currentTenant();
  if (!tenantId) return;
  await supabase.from("erp_funcionarios").delete().eq("id", id).eq("tenant_id", tenantId);
  await revalidateErpCadastros(supabase, tenantId);
}
