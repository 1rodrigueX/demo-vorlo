import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, ASSISTANT_MODEL } from "@/lib/anthropic/client";
import { assistantTools, executeAssistantTool } from "@/lib/assistant/tools";

const SYSTEM_PROMPT = `Você é o assistente de vendas do CRM da Nyplastic, usado por uma pequena equipe de vendedores.
Ajude o vendedor a: sugerir/calcular valores de proposta, salvar o orçamento de um negócio, marcar propostas como
enviadas, marcar vendas como ganhas, e tirar dúvidas sobre a carteira dele.

Regras:
- Nunca invente contactId ou dealId. Sempre use a ferramenta search_contacts (ou list_open_deals) para descobrir o id
  real antes de chamar qualquer ferramenta que muda dados.
- Se houver mais de um contato/negócio compatível, pergunte qual é o correto antes de agir.
- Depois de executar uma ação (salvar orçamento, marcar proposta enviada, marcar venda ganha), confirme na resposta
  final o nome do contato e o valor envolvido.
- Seja direto e objetivo. Respostas curtas, sem enrolação.
- Responda sempre em português do Brasil.`;

const MAX_HISTORY = 20;
const MAX_TOOL_ITERATIONS = 6;
const MAX_MESSAGE_LENGTH = 2000;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("chat_messages")
    .select("role, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(100);

  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada, faça login novamente" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Assistente de IA ainda não configurado (falta a chave da API)" },
      { status: 503 },
    );
  }

  let body: { message?: string };
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY);

  const messages: Anthropic.MessageParam[] = (history ?? [])
    .reverse()
    .map((m) => ({ role: m.role, content: m.content }));
  messages.push({ role: "user", content: userMessage });

  const client = getAnthropicClient();
  const system = `${SYSTEM_PROMPT}\n\nVendedor atual: ${profile?.full_name ?? user.email}.`;

  let finalText = "";
  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await client.messages.create({
        model: ASSISTANT_MODEL,
        max_tokens: 1500,
        system,
        tools: assistantTools,
        messages,
      });

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );
      const textBlocks = response.content.filter(
        (b): b is Anthropic.TextBlock => b.type === "text",
      );
      finalText = textBlocks.map((b) => b.text).join("\n").trim();

      messages.push({ role: "assistant", content: response.content });

      if (response.stop_reason !== "tool_use" || toolUses.length === 0) break;

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUses) {
        const result = await executeAssistantTool(
          supabase,
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
    console.error("Assistant chat error:", err);
    return NextResponse.json(
      { error: "O assistente não conseguiu responder agora. Tente novamente em instantes." },
      { status: 502 },
    );
  }

  if (!finalText) {
    finalText = "Não consegui concluir essa ação. Pode reformular o pedido?";
  }

  await supabase.from("chat_messages").insert([
    { user_id: user.id, role: "user", content: userMessage },
    { user_id: user.id, role: "assistant", content: finalText },
  ]);

  return NextResponse.json({ reply: finalText });
}
