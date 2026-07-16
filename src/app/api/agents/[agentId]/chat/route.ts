import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClientForTenant, AnthropicNotConfiguredError } from "@/lib/anthropic/client";
import { getToolsForAgent } from "@/lib/ai-agents/tools";
import { executeAgentTool } from "@/lib/ai-agents/execute-tool";
import { buildSystemPrompt } from "@/lib/ai-agents/prompt";

const MAX_HISTORY = 20;
const MAX_MEMORY_FACTS = 20;
const MAX_TOOL_ITERATIONS = 6;
const MAX_MESSAGE_LENGTH = 2000;
const AGENT_MANAGEMENT_TOOLS = new Set(["create_agent", "update_agent", "toggle_agent_status", "delete_agent"]);

export async function GET(_request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: agent } = await supabase.from("ai_agents").select("id").eq("id", agentId).maybeSingle();
  if (!agent) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const { data } = await supabase
    .from("ai_agent_messages")
    .select("role, content, created_at")
    .eq("agent_id", agentId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(100);

  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada, faça login novamente" }, { status: 401 });

  let body: { message?: string; contextHint?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const userMessage = (body.message ?? "").trim();
  if (!userMessage) return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
  if (userMessage.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Mensagem muito longa" }, { status: 400 });
  }
  const contextHint = (body.contextHint ?? "").trim().slice(0, 500) || undefined;

  const { data: agent } = await supabase.from("ai_agents").select("*").eq("id", agentId).maybeSingle();
  if (!agent) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  if (agent.status !== "active") {
    return NextResponse.json({ error: "Este agente está desativado" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Perfil não encontrado" }, { status: 400 });
  }

  let client;
  try {
    client = await getAnthropicClientForTenant(profile.tenant_id);
  } catch (err) {
    if (err instanceof AnthropicNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    throw err;
  }

  const [{ data: history }, { data: memoryFacts }] = await Promise.all([
    supabase
      .from("ai_agent_messages")
      .select("role, content")
      .eq("agent_id", agentId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(MAX_HISTORY),
    supabase
      .from("ai_agent_memory")
      .select("label, content")
      .eq("agent_id", agentId)
      .order("updated_at", { ascending: false })
      .limit(MAX_MEMORY_FACTS),
  ]);

  const messages: Anthropic.MessageParam[] = (history ?? [])
    .reverse()
    .map((m) => ({ role: m.role, content: m.content }));
  messages.push({ role: "user", content: userMessage });

  const system = buildSystemPrompt(
    agent,
    memoryFacts ?? [],
    profile.full_name ?? user.email ?? "vendedor",
    contextHint,
  );
  const tools = getToolsForAgent(agent.tools);

  let finalText = "";
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let agentsChanged = false;
  const startedAt = Date.now();

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await client.messages.create({
        model: agent.model,
        max_tokens: 1500,
        system,
        ...(tools.length ? { tools } : {}),
        messages,
      });

      totalInputTokens += response.usage?.input_tokens ?? 0;
      totalOutputTokens += response.usage?.output_tokens ?? 0;

      const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text");
      finalText = textBlocks.map((b) => b.text).join("\n").trim();

      messages.push({ role: "assistant", content: response.content });

      if (response.stop_reason !== "tool_use" || toolUses.length === 0) break;

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUses) {
        if (AGENT_MANAGEMENT_TOOLS.has(toolUse.name)) agentsChanged = true;

        const result = await executeAgentTool(
          supabase,
          profile.tenant_id,
          { id: agent.id, is_fala_ai: agent.is_fala_ai },
          toolUse.name,
          (toolUse.input ?? {}) as Record<string, unknown>,
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result.content,
          is_error: result.isError,
        });
      }
      messages.push({ role: "user", content: toolResults });
    }
  } catch (err) {
    console.error("Agent chat error:", err);
    await supabase.from("ai_agent_logs").insert({
      tenant_id: profile.tenant_id,
      agent_id: agentId,
      user_id: user.id,
      event_type: "error",
      detail: { message: err instanceof Error ? err.message : "erro desconhecido" },
      model: agent.model,
    });
    return NextResponse.json(
      { error: "O agente não conseguiu responder agora. Tente novamente em instantes." },
      { status: 502 },
    );
  }

  if (!finalText) {
    finalText = "Não consegui concluir essa ação. Pode reformular o pedido?";
  }

  await Promise.all([
    supabase.from("ai_agent_messages").insert([
      { tenant_id: profile.tenant_id, agent_id: agentId, user_id: user.id, role: "user", content: userMessage },
      { tenant_id: profile.tenant_id, agent_id: agentId, user_id: user.id, role: "assistant", content: finalText },
    ]),
    supabase.from("ai_agent_logs").insert({
      tenant_id: profile.tenant_id,
      agent_id: agentId,
      user_id: user.id,
      event_type: "message",
      model: agent.model,
      tokens_input: totalInputTokens,
      tokens_output: totalOutputTokens,
      latency_ms: Date.now() - startedAt,
    }),
  ]);

  return NextResponse.json({ reply: finalText, agentsChanged });
}
