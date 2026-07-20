"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId, getTenantSlug } from "@/lib/auth/current-user";
import { ensureCategoria } from "@/lib/actions/financas-categorias";
import type { FinancasInboxItem } from "@/types/domain";

export type ActionState = { error?: string } | null;

export async function getInboxItems(): Promise<FinancasInboxItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return [];

  const { data } = await supabase
    .from("financas_inbox")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .order("entry_date", { ascending: false });

  return data ?? [];
}

/** Aprova um item pendente: cria o lançamento real em Empresarial e marca o item como resolvido. */
export async function approveInboxItem(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: item } = await supabase
    .from("financas_inbox")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .maybeSingle();
  if (!item) return { error: "Item não encontrado (já foi resolvido?)" };

  await ensureCategoria(supabase, tenantId, item.type, item.category);

  const { error: insertError } = await supabase.from("financas_lancamentos").insert({
    tenant_id: tenantId,
    context: "empresarial",
    type: item.type,
    category: item.category,
    description: item.description,
    amount_cents: item.amount_cents,
    entry_date: item.entry_date,
    source: "crm",
    created_by: user.id,
  });
  if (insertError) return { error: `Não foi possível lançar: ${insertError.message}` };

  const { error: updateError } = await supabase
    .from("financas_inbox")
    .update({ status: "approved", resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) return { error: `Lançado, mas não deu pra atualizar a caixa de entrada: ${updateError.message}` };

  const slug = await getTenantSlug(supabase, tenantId);
  if (slug) revalidatePath(`/${slug}/financeiro`);
  return null;
}

export async function dismissInboxItem(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { error } = await supabase
    .from("financas_inbox")
    .update({ status: "dismissed", resolved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) return { error: `Não foi possível descartar: ${error.message}` };

  const slug = await getTenantSlug(supabase, tenantId);
  if (slug) revalidatePath(`/${slug}/financeiro`);
  return null;
}
