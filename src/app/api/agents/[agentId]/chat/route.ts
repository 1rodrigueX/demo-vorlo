import { NextResponse } from "next/server";
import type OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { getOpenAIClientForAgent, OpenAINotConfiguredError } from "@/lib/openai/client";
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

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: agent } = await supabase
    .from("ai_agents")
    .select("id")
    .eq("id", agentId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Perfil não encontrado" }, { status: 400 });
  }

  const { data: agent } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("id", agentId)
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle();
  if (!agent) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });
  if (agent.status !== "active") {
    return NextResponse.json({ error: "Este agente está desativado" }, { status: 400 });
  }

  let client;
  try {
    client = await getOpenAIClientForAgent(profile.tenant_id, agent);
  } catch (err) {
    if (err instanceof OpenAINotConfiguredError) {
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
      .eq("tenant_id", profile.tenant_id)
      .order("updated_at", { ascending: false })
      .limit(MAX_MEMORY_FACTS),
  ]);

  const system = buildSystemPrompt(
    agent,
    memoryFacts ?? [],
    profile.full_name ?? user.email ?? "vendedor",
    contextHint,
  );

  // Na OpenAI o system prompt é a 1ª mensagem do array (na Anthropic era um
  // parâmetro `system` separado).
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...(history ?? []).reverse().map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];
  const tools = getToolsForAgent(agent.tools);

  let finalText = "";
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let agentsChanged = false;
  const startedAt = Date.now();

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await client.chat.completions.create({
        model: agent.model,
        // Teto cobre raciocínio + resposta (ver comentário em runSdrLeadTurn).
        max_completion_tokens: 3000,
        reasoning_effort: "none",
        temperature: agent.temperature,
        ...(tools.length ? { tools } : {}),
        messages,
      });

      totalInputTokens += response.usage?.prompt_tokens ?? 0;
      totalOutputTokens += response.usage?.completion_tokens ?? 0;

      const choice = response.choices[0];
      const assistantMessage = choice?.message;
      if (!assistantMessage) break;

      finalText = (assistantMessage.content ?? "").trim();
      // A mensagem do assistente volta pro histórico inteira (com os
      // tool_calls), senão a API rejeita os resultados de ferramenta depois.
      messages.push(assistantMessage);

      const toolCalls = assistantMessage.tool_calls ?? [];
      if (choice.finish_reason !== "tool_calls" || toolCalls.length === 0) break;

      for (const toolCall of toolCalls) {
        // Só function calls têm .function; tools hospedadas da OpenAI (web
        // search etc.) não são usadas aqui, mas o type union exige a checagem.
        if (toolCall.type !== "function") continue;
        if (AGENT_MANAGEMENT_TOOLS.has(toolCall.function.name)) agentsChanged = true;

        // Na OpenAI os argumentos vêm como string JSON (na Anthropic já vinham
        // como objeto) — modelo pode devolver JSON inválido, então parse protegido.
        let args: Record<string, unknown> = {};
        try {
          args = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
        } catch {
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: "Argumentos inválidos (JSON malformado). Tente de novo com um JSON válido.",
          });
          continue;
        }

        const result = await executeAgentTool(
          supabase,
          profile.tenant_id,
          { id: agent.id, is_fala_ai: agent.is_fala_ai },
          toolCall.function.name,
          args,
        );
        // Não existe is_error na OpenAI — o erro vai no próprio texto.
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result.isError ? `ERRO: ${result.content}` : result.content,
        });
      }
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
