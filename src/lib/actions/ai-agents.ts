"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import {
  createAgentInputSchema,
  updateAgentInputSchema,
  type CreateAgentInput,
  type UpdateAgentInput,
} from "@/lib/validation/ai-agent";
import { AGENT_TEMPLATES } from "@/lib/ai-agents/templates";
import { ASSISTANT_MODEL } from "@/lib/anthropic/client";
import type { Database } from "@/types/database.types";

type AiAgentUpdate = Database["public"]["Tables"]["ai_agents"]["Update"];
type AgentType = CreateAgentInput["type"];

type Result<T> = { data?: T; error?: string };

function friendlyError(message: string, code?: string): string {
  if (code === "42501") return "Você não tem permissão para essa ação (só donos ou gestores podem).";
  return message;
}

/**
 * O Vorlo às vezes chama create_agent com type="custom" mesmo quando o
 * nome corresponde a um template conhecido (ex: pedir "crie um agente SDR"
 * gerou name="SDR" + type="custom"). Sem essa correção, recursos que
 * dependem do type real (ex: o SDR automático de leads no WhatsApp) nunca
 * encontram o agente.
 */
function normalizeAgentType(type: AgentType, name: string): AgentType {
  if (type !== "custom") return type;
  const normalized = name.trim().toLowerCase();
  const knownType = (Object.keys(AGENT_TEMPLATES) as (keyof typeof AGENT_TEMPLATES)[]).find(
    (key) => key === normalized,
  );
  return knownType ?? type;
}

export async function createAgent(
  input: CreateAgentInput,
): Promise<Result<{ agentId: string; name: string; type: string }>> {
  const parsed = createAgentInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { name } = parsed.data;
  const type = normalizeAgentType(parsed.data.type, name);
  let objective = parsed.data.objective;
  let systemPrompt = parsed.data.systemPrompt;
  let tools: string[] | undefined = parsed.data.tools;
  let temperature = parsed.data.temperature;

  if (type === "custom") {
    if (!objective || !systemPrompt) {
      return { error: "Para um agente personalizado, informe objetivo e prompt" };
    }
    tools = tools ?? ["remember_fact"];
    temperature = temperature ?? 0.7;
  } else {
    const template = AGENT_TEMPLATES[type];
    objective = objective ?? template.objective;
    systemPrompt = systemPrompt ?? template.systemPrompt;
    tools = tools ?? [...template.tools];
    temperature = temperature ?? template.temperature;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data, error } = await supabase
    .from("ai_agents")
    .insert({
      tenant_id: tenantId,
      name,
      type,
      objective,
      system_prompt: systemPrompt,
      model: ASSISTANT_MODEL,
      temperature,
      tools,
      created_by: user.id,
    })
    .select("id, name, type")
    .single();

  if (error || !data) {
    console.error("createAgent failed:", error);
    return { error: friendlyError(`Não foi possível criar o agente: ${error?.message ?? "erro desconhecido"}`, error?.code) };
  }

  revalidatePath("/agents");
  return { data: { agentId: data.id, name: data.name, type: data.type } };
}

export async function updateAgent(agentId: string, input: UpdateAgentInput): Promise<Result<{ name: string }>> {
  const parsed = updateAgentInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  if (Object.keys(parsed.data).length === 0) return { error: "Nada para atualizar" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const payload: AiAgentUpdate = {};
  if (parsed.data.name !== undefined) payload.name = parsed.data.name;
  if (parsed.data.objective !== undefined) payload.objective = parsed.data.objective;
  if (parsed.data.systemPrompt !== undefined) payload.system_prompt = parsed.data.systemPrompt;
  if (parsed.data.tools !== undefined) payload.tools = parsed.data.tools;
  if (parsed.data.temperature !== undefined) payload.temperature = parsed.data.temperature;

  const { data, error } = await supabase
    .from("ai_agents")
    .update(payload)
    .eq("id", agentId)
    .select("name")
    .maybeSingle();

  if (error) return { error: friendlyError(`Não foi possível atualizar: ${error.message}`, error.code) };
  if (!data) return { error: "Agente não encontrado ou você não tem permissão pra editá-lo" };

  revalidatePath("/agents");
  return { data: { name: data.name } };
}

export async function toggleAgentStatus(
  agentId: string,
  status: "active" | "inactive",
): Promise<Result<{ name: string; status: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const { data: target } = await supabase
    .from("ai_agents")
    .select("is_fala_ai")
    .eq("id", agentId)
    .maybeSingle();
  if (target?.is_fala_ai) return { error: "Não é possível desativar o Vorlo" };

  const { data, error } = await supabase
    .from("ai_agents")
    .update({ status })
    .eq("id", agentId)
    .select("name, status")
    .maybeSingle();

  if (error) return { error: friendlyError(`Não foi possível atualizar o status: ${error.message}`, error.code) };
  if (!data) return { error: "Agente não encontrado ou você não tem permissão" };

  revalidatePath("/agents");
  return { data };
}

export async function deleteAgent(agentId: string): Promise<Result<{ name: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const { data: target } = await supabase
    .from("ai_agents")
    .select("is_fala_ai, name")
    .eq("id", agentId)
    .maybeSingle();
  if (!target) return { error: "Agente não encontrado" };
  if (target.is_fala_ai) return { error: "Não é possível excluir o Vorlo" };

  const { error } = await supabase.from("ai_agents").delete().eq("id", agentId);
  if (error) return { error: friendlyError(`Não foi possível excluir: ${error.message}`, error.code) };

  revalidatePath("/agents");
  return { data: { name: target.name } };
}
