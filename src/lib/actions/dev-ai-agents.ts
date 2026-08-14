"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserDev } from "@/lib/auth/current-user";
import { updateAgentInputSchema } from "@/lib/validation/ai-agent";
import type { AiAgent } from "@/types/domain";

export type ActionState = { error?: string } | null;

/** Vorlo (FALA AI) do tenant, pro painel dev — nunca exposto na tela de Agentes do próprio cliente (ver listAgents em ai-agents.ts). */
export async function getFalaAiForTenant(tenantId: string): Promise<AiAgent | null> {
  if (!(await isCurrentUserDev())) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_agents")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_fala_ai", true)
    .maybeSingle();
  return data ?? null;
}

/**
 * Edita o Vorlo de um tenant qualquer — só dev, via service role (não passa
 * por currentTenantContext(), que só resolveria o tenant que o próprio dev
 * está "visitando" no momento; aqui o dev edita direto pelo id, sem precisar
 * trocar de visita a cada empresa). Sem `tools` de propósito — as ferramentas
 * do Vorlo são administrativas (create_agent, delete_agent etc), editar isso
 * sem querer tira a capacidade dele de se auto-gerenciar.
 */
export async function updateFalaAiAsDev(
  tenantId: string,
  agentId: string,
  input: { name?: string; objective?: string; systemPrompt?: string; temperature?: number },
): Promise<ActionState> {
  if (!(await isCurrentUserDev())) {
    return { error: "Acesso restrito a devs da plataforma" };
  }

  const parsed = updateAgentInputSchema.omit({ tools: true }).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  if (Object.keys(parsed.data).length === 0) return { error: "Nada para atualizar" };

  const payload: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) payload.name = parsed.data.name;
  if (parsed.data.objective !== undefined) payload.objective = parsed.data.objective;
  if (parsed.data.systemPrompt !== undefined) payload.system_prompt = parsed.data.systemPrompt;
  if (parsed.data.temperature !== undefined) payload.temperature = parsed.data.temperature;

  const admin = createAdminClient();
  const { error } = await admin
    .from("ai_agents")
    .update(payload)
    .eq("id", agentId)
    .eq("tenant_id", tenantId)
    .eq("is_fala_ai", true);

  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  revalidatePath("/dev");
  return null;
}
