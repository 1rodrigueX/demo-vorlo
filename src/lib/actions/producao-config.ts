"use server";

import { createClient } from "@/lib/supabase/server";
import { currentTenantContext, revalidateTenantPaths } from "@/lib/auth/current-user";
import { currentActorTenantContext } from "@/lib/producao/actor";
import { turnoSchema, maquinaSchema, estiloSchema } from "@/lib/validation/producao";
import type { ProducaoTurno, ProducaoMaquina, ProducaoEstilo } from "@/types/domain";

export type ActionState = { error?: string } | null;

async function revalidateProducao(supabase: Awaited<ReturnType<typeof createClient>>, tenantId: string) {
  await revalidateTenantPaths(supabase, tenantId, ["/producao/configuracoes"]);
}

// ── Turnos ──────────────────────────────────────────────────────────────

export async function getTurnos(): Promise<ProducaoTurno[]> {
  const { supabase, tenantId } = await currentActorTenantContext();
  if (!tenantId) return [];
  const { data } = await supabase.from("producao_turnos").select("*").eq("tenant_id", tenantId).order("name");
  return data ?? [];
}

export async function createTurno(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = turnoSchema.safeParse({
    name: formData.get("name"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { supabase, user, tenantId } = await currentTenantContext();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { error } = await supabase.from("producao_turnos").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    start_time: parsed.data.startTime || null,
    end_time: parsed.data.endTime || null,
  });
  if (error) {
    const message = error.code === "23505" ? "Já existe um turno com esse nome" : error.message;
    return { error: `Não foi possível criar: ${message}` };
  }

  await revalidateProducao(supabase, tenantId);
  return null;
}

export async function deleteTurno(id: string) {
  const { supabase, tenantId } = await currentTenantContext();
  if (!tenantId) return;
  await supabase.from("producao_turnos").delete().eq("id", id).eq("tenant_id", tenantId);
  await revalidateProducao(supabase, tenantId);
}

// ── Máquinas ────────────────────────────────────────────────────────────

export async function getMaquinas(): Promise<ProducaoMaquina[]> {
  const { supabase, tenantId } = await currentActorTenantContext();
  if (!tenantId) return [];
  const { data } = await supabase.from("producao_maquinas").select("*").eq("tenant_id", tenantId).order("name");
  return data ?? [];
}

export async function createMaquina(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = maquinaSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { supabase, user, tenantId } = await currentTenantContext();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { error } = await supabase.from("producao_maquinas").insert({ tenant_id: tenantId, name: parsed.data.name });
  if (error) {
    const message = error.code === "23505" ? "Já existe uma máquina com esse nome" : error.message;
    return { error: `Não foi possível criar: ${message}` };
  }

  await revalidateProducao(supabase, tenantId);
  return null;
}

export async function updateMaquinaStatus(id: string, status: "ativa" | "manutencao" | "parada") {
  const { supabase, tenantId } = await currentTenantContext();
  if (!tenantId) return;
  await supabase.from("producao_maquinas").update({ status }).eq("id", id).eq("tenant_id", tenantId);
  await revalidateProducao(supabase, tenantId);
}

export async function deleteMaquina(id: string) {
  const { supabase, tenantId } = await currentTenantContext();
  if (!tenantId) return;
  await supabase.from("producao_maquinas").delete().eq("id", id).eq("tenant_id", tenantId);
  await revalidateProducao(supabase, tenantId);
}

// ── Estilos de produção ─────────────────────────────────────────────────

export async function getEstilos(): Promise<ProducaoEstilo[]> {
  const { supabase, tenantId } = await currentActorTenantContext();
  if (!tenantId) return [];
  const { data } = await supabase.from("producao_estilos").select("*").eq("tenant_id", tenantId).order("name");
  return data ?? [];
}

export async function createEstilo(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = estiloSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { supabase, user, tenantId } = await currentTenantContext();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { error } = await supabase.from("producao_estilos").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    description: parsed.data.description || null,
  });
  if (error) {
    const message = error.code === "23505" ? "Já existe um estilo com esse nome" : error.message;
    return { error: `Não foi possível criar: ${message}` };
  }

  await revalidateProducao(supabase, tenantId);
  return null;
}

export async function deleteEstilo(id: string) {
  const { supabase, tenantId } = await currentTenantContext();
  if (!tenantId) return;
  await supabase.from("producao_estilos").delete().eq("id", id).eq("tenant_id", tenantId);
  await revalidateProducao(supabase, tenantId);
}
