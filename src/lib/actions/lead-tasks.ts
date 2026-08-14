"use server";

import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import type { LeadTask } from "@/types/domain";

export type ActionState = { error?: string } | null;

/** Tarefas do lead. Retorna [] se a tabela ainda não existe (migration 0067
 * não aplicada) — a UI só fica sem tarefas, sem quebrar. */
export async function getLeadTasks(contactId: string): Promise<LeadTask[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return [];

  const { data } = await supabase
    .from("lead_tasks")
    .select("*")
    .eq("contact_id", contactId)
    .eq("tenant_id", tenantId)
    .order("done", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function createLeadTask(input: {
  contactId: string;
  title: string;
  dueAt?: string | null;
}): Promise<ActionState> {
  const title = input.title.trim();
  if (!title) return { error: "Descreva a tarefa" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { error } = await supabase.from("lead_tasks").insert({
    tenant_id: tenantId,
    contact_id: input.contactId,
    title,
    due_at: input.dueAt || null,
    created_by: user.id,
  });

  if (error) return { error: mapDbError(error.message) };
  return null;
}

export async function toggleLeadTask(id: string, done: boolean): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { error } = await supabase
    .from("lead_tasks")
    .update({ done, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) return { error: mapDbError(error.message) };
  return null;
}

export async function deleteLeadTask(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { error } = await supabase.from("lead_tasks").delete().eq("id", id).eq("tenant_id", tenantId);
  if (error) return { error: mapDbError(error.message) };
  return null;
}

function mapDbError(message: string): string {
  if (/relation .*lead_tasks.* does not exist/i.test(message)) {
    return "Tarefas ainda não estão ativas — aplique a migration 0067_lead_tasks no Supabase.";
  }
  return message;
}
