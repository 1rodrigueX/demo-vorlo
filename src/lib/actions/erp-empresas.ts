"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId, getTenantSlug } from "@/lib/auth/current-user";
import { erpEmpresaSchema } from "@/lib/validation/erp-cadastros";
import type { ErpEmpresa } from "@/types/domain";

export type ActionState = { error?: string } | null;

type DbClient = Awaited<ReturnType<typeof createClient>>;

async function currentTenant() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, tenantId: null };
  const tenantId = await requireTenantId(supabase, user.id);
  return { supabase, user, tenantId };
}

async function revalidateEmpresas(supabase: DbClient, tenantId: string) {
  const slug = await getTenantSlug(supabase, tenantId);
  if (slug) revalidatePath(`/${slug}/erp/cadastros/empresas`);
}

export async function getErpEmpresas(): Promise<ErpEmpresa[]> {
  const { supabase, tenantId } = await currentTenant();
  if (!tenantId) return [];
  const { data } = await supabase
    .from("erp_empresas")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("is_matriz", { ascending: false })
    .order("name");
  return data ?? [];
}

/**
 * Quantas empresas o tenant já pode ter: a 1ª (matriz) é sempre grátis; as
 * extras vêm de tenants.erp_extra_empresas_granted, concedido pelo Suporte
 * (ver solicitar_empresa_extra em execute-tool.ts) ou manualmente pelo dev.
 */
export async function getErpEmpresaLimit(): Promise<{ used: number; allowed: number } | null> {
  const { supabase, tenantId } = await currentTenant();
  if (!tenantId) return null;

  const [{ count }, { data: tenant }] = await Promise.all([
    supabase.from("erp_empresas").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    supabase.from("tenants").select("erp_extra_empresas_granted").eq("id", tenantId).maybeSingle(),
  ]);

  return { used: count ?? 0, allowed: 1 + (tenant?.erp_extra_empresas_granted ?? 0) };
}

export async function createErpEmpresa(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = erpEmpresaSchema.safeParse({
    name: formData.get("name"),
    cnpj: formData.get("cnpj"),
    regimeTributario: formData.get("regimeTributario"),
    isMatriz: formData.get("isMatriz") === "on",
    city: formData.get("city"),
    state: formData.get("state"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { supabase, user, tenantId } = await currentTenant();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: hasErp } = await supabase.rpc("current_tenant_has_erp", { p_user_id: user.id });
  if (!hasErp) return { error: "ERP não está ativo pra este tenant" };

  const limit = await getErpEmpresaLimit();
  if (limit && limit.used >= limit.allowed) {
    return {
      error:
        "Você já tem o máximo de empresas incluídas no seu plano. Peça uma empresa a mais no Suporte (chat do Vorlo).",
    };
  }

  const { error } = await supabase.from("erp_empresas").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    cnpj: parsed.data.cnpj,
    regime_tributario: parsed.data.regimeTributario,
    is_matriz: parsed.data.isMatriz ?? limit?.used === 0, // a 1ª empresa vira matriz por padrão
    city: parsed.data.city || null,
    state: parsed.data.state || null,
  });
  if (error) {
    const message =
      error.code === "23505"
        ? /matriz/.test(error.message)
          ? "Já existe uma matriz cadastrada — desmarque a atual antes de definir outra"
          : "Já existe uma empresa com esse CNPJ"
        : error.message;
    return { error: `Não foi possível criar: ${message}` };
  }

  await revalidateEmpresas(supabase, tenantId);
  return null;
}

export async function updateErpEmpresa(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = erpEmpresaSchema.safeParse({
    name: formData.get("name"),
    cnpj: formData.get("cnpj"),
    regimeTributario: formData.get("regimeTributario"),
    isMatriz: formData.get("isMatriz") === "on",
    city: formData.get("city"),
    state: formData.get("state"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { supabase, user, tenantId } = await currentTenant();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: hasErp } = await supabase.rpc("current_tenant_has_erp", { p_user_id: user.id });
  if (!hasErp) return { error: "ERP não está ativo pra este tenant" };

  const { error } = await supabase
    .from("erp_empresas")
    .update({
      name: parsed.data.name,
      cnpj: parsed.data.cnpj,
      regime_tributario: parsed.data.regimeTributario,
      is_matriz: parsed.data.isMatriz ?? false,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) {
    const message =
      error.code === "23505"
        ? /matriz/.test(error.message)
          ? "Já existe uma matriz cadastrada — desmarque a atual antes de definir outra"
          : "Já existe uma empresa com esse CNPJ"
        : error.message;
    return { error: `Não foi possível salvar: ${message}` };
  }

  await revalidateEmpresas(supabase, tenantId);
  return null;
}

export async function deleteErpEmpresa(id: string): Promise<{ error?: string }> {
  const { supabase, user, tenantId } = await currentTenant();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: hasErp } = await supabase.rpc("current_tenant_has_erp", { p_user_id: user.id });
  if (!hasErp) return { error: "ERP não está ativo pra este tenant" };

  const { error } = await supabase.from("erp_empresas").delete().eq("id", id).eq("tenant_id", tenantId);
  if (error) return { error: `Não foi possível excluir: ${error.message}` };

  await revalidateEmpresas(supabase, tenantId);
  return {};
}
