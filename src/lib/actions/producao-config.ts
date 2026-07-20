"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId, getTenantSlug } from "@/lib/auth/current-user";
import { requireProducaoActorTenantId } from "@/lib/producao/actor";
import { turnoSchema, maquinaSchema, estiloSchema } from "@/lib/validation/producao";
import type { ProducaoTurno, ProducaoMaquina, ProducaoEstilo } from "@/types/domain";

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

/** Como currentTenant(), mas também resolve funcionário de Produção — só pra leituras. */
async function currentActorTenant() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, tenantId: null };
  const tenantId = await requireProducaoActorTenantId(supabase, user.id);
  return { supabase, user, tenantId };
}

async function revalidateProducao(supabase: Awaited<ReturnType<typeof createClient>>, tenantId: string) {
  const slug = await getTenantSlug(supabase, tenantId);
  if (slug) revalidatePath(`/${slug}/producao/configuracoes`);
}

// ── Turnos ──────────────────────────────────────────────────────────────

export async function getTurnos(): Promise<ProducaoTurno[]> {
  const { supabase, tenantId } = await currentActorTenant();
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

  const { supabase, user, tenantId } = await currentTenant();
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
  const { supabase, tenantId } = await currentTenant();
  if (!tenantId) return;
  await supabase.from("producao_turnos").delete().eq("id", id).eq("tenant_id", tenantId);
  await revalidateProducao(supabase, tenantId);
}

// ── Máquinas ────────────────────────────────────────────────────────────

export async function getMaquinas(): Promise<ProducaoMaquina[]> {
  const { supabase, tenantId } = await currentActorTenant();
  if (!tenantId) return [];
  const { data } = await supabase.from("producao_maquinas").select("*").eq("tenant_id", tenantId).order("name");
  return data ?? [];
}

export async function createMaquina(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = maquinaSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { supabase, user, tenantId } = await currentTenant();
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
  const { supabase, tenantId } = await currentTenant();
  if (!tenantId) return;
  await supabase.from("producao_maquinas").update({ status }).eq("id", id).eq("tenant_id", tenantId);
  await revalidateProducao(supabase, tenantId);
}

export async function deleteMaquina(id: string) {
  const { supabase, tenantId } = await currentTenant();
  if (!tenantId) return;
  await supabase.from("producao_maquinas").delete().eq("id", id).eq("tenant_id", tenantId);
  await revalidateProducao(supabase, tenantId);
}

// ── Estilos de produção ─────────────────────────────────────────────────

export async function getEstilos(): Promise<ProducaoEstilo[]> {
  const { supabase, tenantId } = await currentActorTenant();
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

  const { supabase, user, tenantId } = await currentTenant();
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
  const { supabase, tenantId } = await currentTenant();
  if (!tenantId) return;
  await supabase.from("producao_estilos").delete().eq("id", id).eq("tenant_id", tenantId);
  await revalidateProducao(supabase, tenantId);
}
