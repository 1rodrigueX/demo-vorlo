"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";

export type FlowActionResult = { error: string } | { ok: true };

/** Traduz o erro do banco pra uma mensagem clara. O motivo mais comum de falha
 * é a migration 0069 ainda não aplicada (tabela não existe) — antes essa
 * situação aparecia como "só administradores", o que confundia. */
function mapFlowError(message: string | undefined, verb: "criar" | "salvar" | "apagar"): string {
  if (message && /relation .*automation_flows.* does not exist/i.test(message)) {
    return "As Trajetórias ainda não estão ativas — aplique a migration 0069_automation_flows no Supabase.";
  }
  if (message && /(row-level security|violates row-level|permission denied|policy)/i.test(message)) {
    return `Só administradores (owner ou gerente) podem ${verb} trajetórias.`;
  }
  return message ? `Não foi possível ${verb}: ${message}` : `Não foi possível ${verb} a trajetória.`;
}

const nodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["trigger", "action"]),
  kind: z.string().min(1),
  x: z.number(),
  y: z.number(),
  config: z.record(z.string(), z.union([z.string(), z.number(), z.null()])).default({}),
});

const edgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
});

const graphSchema = z.object({
  nodes: z.array(nodeSchema).max(200),
  edges: z.array(edgeSchema).max(400),
});

const saveSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Dê um nome à trajetória").max(120),
  status: z.enum(["draft", "active"]),
  graph: graphSchema,
});

export type SaveFlowInput = z.infer<typeof saveSchema>;

async function tenantForCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, tenantId: null, userId: null };
  const tenantId = await requireTenantId(supabase, user.id);
  return { supabase, tenantId, userId: user.id };
}

/** Cria uma trajetória vazia (rascunho) e devolve o id pra abrir no editor. */
export async function createFlow(name: string): Promise<{ id: string } | { error: string }> {
  const parsedName = z.string().trim().min(1, "Dê um nome à trajetória").max(120).safeParse(name);
  if (!parsedName.success) return { error: parsedName.error.issues[0]?.message ?? "Nome inválido" };

  const { supabase, tenantId, userId } = await tenantForCurrentUser();
  if (!tenantId || !userId) return { error: "Sessão expirada, faça login novamente" };

  const { data, error } = await supabase
    .from("automation_flows")
    .insert({ tenant_id: tenantId, name: parsedName.data, created_by: userId })
    .select("id")
    .single();

  if (error || !data) {
    return { error: mapFlowError(error?.message, "criar") };
  }

  revalidatePath("/[tenantSlug]/trajetorias", "page");
  return { id: data.id };
}

/** Cria uma trajetória já com um grafo pronto (usado pelo "Criar com a IA"). */
export async function createFlowWithGraph(
  name: string,
  graph: unknown,
): Promise<{ id: string } | { error: string }> {
  const parsedName = z.string().trim().min(1, "Dê um nome à trajetória").max(120).safeParse(name);
  if (!parsedName.success) return { error: parsedName.error.issues[0]?.message ?? "Nome inválido" };
  const parsedGraph = graphSchema.safeParse(graph);
  if (!parsedGraph.success) return { error: "Fluxo gerado inválido" };

  const { supabase, tenantId, userId } = await tenantForCurrentUser();
  if (!tenantId || !userId) return { error: "Sessão expirada, faça login novamente" };

  const { data, error } = await supabase
    .from("automation_flows")
    .insert({ tenant_id: tenantId, name: parsedName.data, graph: parsedGraph.data, created_by: userId })
    .select("id")
    .single();

  if (error || !data) return { error: mapFlowError(error?.message, "criar") };

  revalidatePath("/[tenantSlug]/trajetorias", "page");
  return { id: data.id };
}

/** Salva o grafo inteiro (nome, status e nós/arestas) de uma trajetória. */
export async function saveFlow(input: SaveFlowInput): Promise<FlowActionResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { supabase, tenantId } = await tenantForCurrentUser();
  if (!tenantId) return { error: "Sessão expirada, faça login novamente" };

  const { id, name, status, graph } = parsed.data;
  const { error } = await supabase
    .from("automation_flows")
    .update({ name, status, graph, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { error: mapFlowError(error.message, "salvar") };

  revalidatePath(`/[tenantSlug]/trajetorias/${id}`, "page");
  revalidatePath("/[tenantSlug]/trajetorias", "page");
  return { ok: true };
}

/** Apaga uma trajetória. */
export async function deleteFlow(id: string): Promise<FlowActionResult> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { error: "Id inválido" };

  const { supabase, tenantId } = await tenantForCurrentUser();
  if (!tenantId) return { error: "Sessão expirada, faça login novamente" };

  const { error } = await supabase
    .from("automation_flows")
    .delete()
    .eq("id", parsed.data)
    .eq("tenant_id", tenantId);

  if (error) return { error: mapFlowError(error.message, "apagar") };

  revalidatePath("/[tenantSlug]/trajetorias", "page");
  return { ok: true };
}
