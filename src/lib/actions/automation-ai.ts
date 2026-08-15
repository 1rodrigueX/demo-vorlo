"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import type OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { getOpenAIClientForTenant, ASSISTANT_MODEL, OpenAINotConfiguredError } from "@/lib/openai/client";
import { FLOW_CATALOG, getNodeDef, defaultConfigFor } from "@/lib/automations/flow-catalog";
import type { FlowGraph, FlowNode, FlowEdge, FlowNodeConfig } from "@/lib/automations/flow-types";

const KINDS = FLOW_CATALOG.map((d) => d.kind);

const BUILD_FLOW_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "build_flow",
    description: "Monta a trajetória (automação) pedida pelo usuário, com nós e ligações.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nome curto e claro da trajetória (até ~6 palavras)." },
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Id temporário do nó (ex: 'n1'), usado nas ligações." },
              type: { type: "string", enum: ["trigger", "action"] },
              kind: { type: "string", enum: KINDS },
              config: { type: "object", description: "Campos de configuração do nó (ver instruções)." },
            },
            required: ["id", "type", "kind"],
          },
        },
        edges: {
          type: "array",
          items: {
            type: "object",
            properties: { source: { type: "string" }, target: { type: "string" } },
            required: ["source", "target"],
          },
        },
        newStages: {
          type: "array",
          items: { type: "string" },
          description: "Nomes de novas etapas do funil a criar, se o pedido precisar de uma que não existe.",
        },
        newTags: {
          type: "array",
          items: { type: "string" },
          description: "Nomes de novas tags a criar, se necessário.",
        },
      },
      required: ["name", "nodes", "edges"],
    },
  },
};

const aiSchema = z.object({
  name: z.string().trim().min(1).max(120),
  nodes: z
    .array(
      z.object({
        id: z.string().min(1),
        type: z.enum(["trigger", "action"]),
        kind: z.string(),
        config: z.record(z.string(), z.unknown()).optional().default({}),
      }),
    )
    .min(1)
    .max(40),
  edges: z.array(z.object({ source: z.string(), target: z.string() })).max(80).optional().default([]),
  newStages: z.array(z.string()).max(20).optional().default([]),
  newTags: z.array(z.string()).max(20).optional().default([]),
});

type StageRow = { id: string; name: string; position: number | null };
type MemberRow = { id: string; full_name: string | null };
type TagRow = { name: string };

function buildSystemPrompt(stages: StageRow[], members: MemberRow[], tags: TagRow[]): string {
  const catalog = FLOW_CATALOG.map((d) => {
    const fields =
      d.fields
        .map((f) => {
          if (f.optionsSource === "static") return `${f.key} (${f.staticOptions?.map((o) => o.value).join("|")})`;
          return f.key;
        })
        .join(", ") || "sem config";
    return `- ${d.kind} [${d.type === "trigger" ? "gatilho" : "ação"}] — ${d.description} | config: ${fields}`;
  }).join("\n");

  const stageList = stages.length ? stages.map((s) => `"${s.name}" (id: ${s.id})`).join(", ") : "nenhuma";
  const memberList = members.length
    ? members.map((m) => `"${m.full_name ?? "?"}" (id: ${m.id})`).join(", ")
    : "nenhum";
  const tagList = tags.length ? tags.map((t) => `"${t.name}"`).join(", ") : "nenhuma";

  return [
    "Você monta automações (chamadas de \"trajetórias\") de um CRM a partir de um pedido em linguagem natural.",
    "Responda SEMPRE chamando a ferramenta build_flow — nunca texto solto.",
    "",
    "TIPOS DE NÓ (use exatamente esses valores em \"kind\"):",
    catalog,
    "",
    `ETAPAS DO FUNIL EXISTENTES: ${stageList}`,
    `RESPONSÁVEIS (equipe): ${memberList}`,
    `TAGS EXISTENTES: ${tagList}`,
    "",
    "REGRAS:",
    "- Todo fluxo começa por exatamente 1 gatilho (type=trigger).",
    "- Ligue os nós em sequência com edges (source→target) usando os ids que VOCÊ deu aos nós.",
    "- Em move_stage e stage_changed, use em config.stageId o id de uma etapa existente OU o NOME de uma etapa (existente ou que você liste em newStages).",
    "- Em assign_user, use em config.userId o id de um responsável da lista. Se não houver um claro, não use esse nó.",
    "- Em add_tag, config.tagName é o nome da tag; se for nova, liste em newTags.",
    "- Em send_whatsapp, config.message é o texto (pode usar {nome} pro primeiro nome do lead).",
    "- Em wait, config.amount é número e config.unit é minutes, hours ou days.",
    "- Prefira o que já existe. Só crie etapa/tag nova quando o pedido realmente precisar.",
    "- Cada CRM é diferente: adapte ao contexto do pedido. Seja objetivo, só os passos necessários.",
    "- Escreva mensagens e nomes em português.",
  ].join("\n");
}

type ResolveCtx = {
  stageByName: Map<string, string>;
  existingStageIds: Set<string>;
  memberById: Set<string>;
  memberByName: Map<string, string>;
};

function coerceConfig(kind: string, raw: Record<string, unknown>, ctx: ResolveCtx): FlowNodeConfig {
  const def = getNodeDef(kind);
  const cfg: FlowNodeConfig = def ? defaultConfigFor(def) : {};
  const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
  if (typeof raw._label === "string") cfg._label = raw._label;

  const resolveStage = (v: string) => {
    if (!v) return "";
    if (ctx.existingStageIds.has(v)) return v;
    return ctx.stageByName.get(v.toLowerCase()) ?? "";
  };

  switch (kind) {
    case "send_whatsapp":
      cfg.message = str(raw.message);
      break;
    case "add_tag":
      cfg.tagName = str(raw.tagName);
      break;
    case "create_task":
      cfg.title = str(raw.title);
      break;
    case "custom":
      cfg.note = str(raw.note);
      break;
    case "wait": {
      const amt = Number(raw.amount);
      cfg.amount = Number.isFinite(amt) && amt > 0 ? Math.round(amt) : 1;
      const u = str(raw.unit);
      cfg.unit = ["minutes", "hours", "days"].includes(u) ? u : "hours";
      break;
    }
    case "move_stage":
    case "stage_changed":
      cfg.stageId = resolveStage(str(raw.stageId));
      break;
    case "assign_user": {
      const v = str(raw.userId);
      cfg.userId = !v ? "" : ctx.memberById.has(v) ? v : (ctx.memberByName.get(v.toLowerCase()) ?? "");
      break;
    }
  }
  return cfg;
}

/** Layout em camadas (esquerda→direita) a partir da profundidade de cada nó. */
function layout(nodes: FlowNode[], edges: FlowEdge[]) {
  const depth = new Map<string, number>();
  nodes.forEach((n) => depth.set(n.id, 0));
  for (let i = 0; i < nodes.length; i++) {
    let changed = false;
    for (const e of edges) {
      const d = (depth.get(e.source) ?? 0) + 1;
      if (d > (depth.get(e.target) ?? 0)) {
        depth.set(e.target, d);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const byDepth = new Map<number, FlowNode[]>();
  nodes.forEach((n) => {
    const d = depth.get(n.id) ?? 0;
    (byDepth.get(d) ?? byDepth.set(d, []).get(d)!).push(n);
  });
  for (const [d, group] of byDepth) {
    group.forEach((n, i) => {
      n.x = 60 + d * 300;
      n.y = 40 + i * 170;
    });
  }
}

/**
 * "Criar com a IA": recebe o pedido em linguagem natural e devolve o grafo da
 * trajetória. Cria etapas/tags novas no CRM quando o pedido precisar (cada
 * cliente monta o funil do seu jeito). Não persiste a trajetória em si — quem
 * chama decide criar (lista) ou carregar no editor.
 */
export async function generateFlowGraph(
  prompt: string,
): Promise<{ name: string; graph: FlowGraph } | { error: string }> {
  const clean = (prompt ?? "").trim();
  if (clean.length < 3) return { error: "Descreva o que a automação deve fazer." };
  if (clean.length > 2000) return { error: "Descrição muito longa (máx. 2000 caracteres)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };
  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const [{ data: stages }, { data: members }, { data: tags }] = await Promise.all([
    supabase.from("pipeline_stages").select("id, name, position").eq("tenant_id", tenantId).order("position"),
    supabase.from("profiles").select("id, full_name").eq("tenant_id", tenantId),
    supabase.from("tags").select("name").eq("tenant_id", tenantId),
  ]);

  // Usa a chave OpenAI do PRÓPRIO cliente (a mesma da SDR) — a chave da
  // Vorlo/plataforma é só pro suporte, não pra rodar a trajetória do tenant.
  let client: OpenAI;
  try {
    client = await getOpenAIClientForTenant(tenantId);
  } catch (err) {
    if (err instanceof OpenAINotConfiguredError) {
      return {
        error:
          "Para criar com IA, conecte a chave da API da OpenAI do seu CRM em Configurações › Inteligência Artificial (a mesma usada pela SDR).",
      };
    }
    return { error: "IA indisponível no momento." };
  }

  const system = buildSystemPrompt(stages ?? [], members ?? [], tags ?? []);

  let toolInput: unknown;
  try {
    const resp = await client.chat.completions.create({
      model: ASSISTANT_MODEL,
      max_completion_tokens: 3000,
      tools: [BUILD_FLOW_TOOL],
      // Força a chamada da ferramenta (na Anthropic era {type:"tool", name}).
      tool_choice: { type: "function", function: { name: "build_flow" } },
      messages: [
        { role: "system", content: system },
        { role: "user", content: clean },
      ],
    });
    const call = resp.choices[0]?.message?.tool_calls?.find(
      (c) => c.type === "function" && c.function.name === "build_flow",
    );
    if (!call || call.type !== "function") {
      return { error: "A IA não conseguiu montar a trajetória. Tente reescrever o pedido." };
    }
    // Argumentos vêm como string JSON na OpenAI (na Anthropic já vinham como objeto).
    toolInput = call.function.arguments ? JSON.parse(call.function.arguments) : {};
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro desconhecido";
    return { error: `Falha ao gerar com IA: ${msg}` };
  }

  const parsed = aiSchema.safeParse(toolInput);
  if (!parsed.success) return { error: "A IA devolveu um formato inesperado. Tente de novo." };

  // Cria etapas novas e monta o mapa nome→id (existentes + criadas).
  const stageByName = new Map<string, string>();
  (stages ?? []).forEach((s) => stageByName.set(s.name.toLowerCase(), s.id));
  const existingStageIds = new Set((stages ?? []).map((s) => s.id));
  let nextPos = (stages ?? []).reduce((m, s) => Math.max(m, s.position ?? 0), 0) + 1;

  for (const raw of parsed.data.newStages) {
    const name = raw.trim();
    if (!name || stageByName.has(name.toLowerCase())) continue;
    const { data: created } = await supabase
      .from("pipeline_stages")
      .insert({ tenant_id: tenantId, name, position: nextPos++, color: "#94a3b8", is_won: false, is_lost: false })
      .select("id")
      .single();
    if (created) {
      stageByName.set(name.toLowerCase(), created.id);
      existingStageIds.add(created.id);
    }
  }

  // Cria tags novas.
  const existingTagNames = new Set((tags ?? []).map((t) => t.name.toLowerCase()));
  for (const raw of parsed.data.newTags) {
    const name = raw.trim();
    if (!name || existingTagNames.has(name.toLowerCase())) continue;
    await supabase.from("tags").insert({ tenant_id: tenantId, name, color: "#94a3b8" });
    existingTagNames.add(name.toLowerCase());
  }

  const memberById = new Set((members ?? []).map((m) => m.id));
  const memberByName = new Map<string, string>();
  (members ?? []).forEach((m) => {
    if (m.full_name) memberByName.set(m.full_name.toLowerCase(), m.id);
  });
  const ctx: ResolveCtx = { stageByName, existingStageIds, memberById, memberByName };

  // Remapeia ids da IA pra uuids e normaliza os nós.
  const idMap = new Map<string, string>();
  const nodes: FlowNode[] = [];
  for (const n of parsed.data.nodes) {
    const def = getNodeDef(n.kind);
    if (!def) continue;
    const newId = randomUUID();
    idMap.set(n.id, newId);
    nodes.push({
      id: newId,
      type: def.type,
      kind: n.kind,
      x: 0,
      y: 0,
      config: coerceConfig(n.kind, n.config, ctx),
    });
  }
  if (!nodes.length) return { error: "A IA não gerou nenhum passo válido. Tente reescrever o pedido." };

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const edges: FlowEdge[] = [];
  const seen = new Set<string>();
  for (const e of parsed.data.edges) {
    const s = idMap.get(e.source);
    const t = idMap.get(e.target);
    if (!s || !t || s === t) continue;
    const target = nodeById.get(t);
    if (!target || target.type !== "action") continue; // gatilho não recebe entrada
    const key = `${s}->${t}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ id: randomUUID(), source: s, target: t });
  }

  layout(nodes, edges);

  return { name: parsed.data.name.slice(0, 120), graph: { nodes, edges } };
}
