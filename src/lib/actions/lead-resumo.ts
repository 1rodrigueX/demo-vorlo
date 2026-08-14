"use server";

import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { getAnthropicClientForAgent, ASSISTANT_MODEL, AnthropicNotConfiguredError } from "@/lib/anthropic/client";

export type LeadResumo = {
  resumo: string;
  probabilidade: number; // 0-100
  proximaAcao: string;
};

export type LeadResumoResult = { ok: true; data: LeadResumo } | { ok: false; error: string };

/**
 * Resumo por IA da conversa do lead: gera um resumo curto, uma probabilidade
 * estimada de fechamento (0-100) e a próxima ação sugerida. Roda sob demanda
 * (botão "Gerar resumo") pra não gastar token a cada carga da tela. Usa a chave
 * do tenant ou, no fallback do Vorlo, a chave da plataforma.
 */
export async function generateLeadResumo(contactId: string): Promise<LeadResumoResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { ok: false, error: "Tenant não encontrado" };

  const [{ data: contact }, { data: messages }, { data: deal }] = await Promise.all([
    supabase.from("contacts").select("name, phone, lead_source").eq("id", contactId).eq("tenant_id", tenantId).maybeSingle(),
    supabase
      .from("whatsapp_messages")
      .select("direction, body, created_at")
      .eq("contact_id", contactId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("deals")
      .select("value, status")
      .eq("contact_id", contactId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!contact) return { ok: false, error: "Lead não encontrado" };

  const transcript = (messages ?? [])
    .slice()
    .reverse()
    .map((m) => `${m.direction === "inbound" ? "Lead" : "Vendedor"}: ${(m.body ?? "").trim()}`)
    .filter((l) => l.length > 8)
    .slice(-30)
    .join("\n");

  if (!transcript) {
    return { ok: false, error: "Ainda não há conversa suficiente pra resumir." };
  }

  const dealLine = deal ? `Negócio: R$ ${Number(deal.value).toFixed(2)}, status ${deal.status}.` : "Sem negócio registrado ainda.";

  const prompt = `Você é o Vorlo, assistente de vendas do CRM. Analise a conversa do lead "${contact.name}" e responda SOMENTE com um JSON válido, sem texto antes ou depois, no formato:
{"resumo": "<2-3 frases sobre o interesse e a situação do lead>", "probabilidade": <número inteiro de 0 a 100 estimando a chance de fechamento>, "proximaAcao": "<uma ação objetiva sugerida para o vendedor>"}

${dealLine}
Origem do lead: ${contact.lead_source ?? "desconhecida"}.

Conversa (mais antiga -> mais recente):
${transcript}`;

  let client;
  try {
    client = await getAnthropicClientForAgent(tenantId, { is_fala_ai: true });
  } catch (err) {
    if (err instanceof AnthropicNotConfiguredError) return { ok: false, error: err.message };
    return { ok: false, error: "Falha ao acessar a IA" };
  }

  try {
    const response = await client.messages.create({
      model: ASSISTANT_MODEL,
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    const parsed = parseResumo(text);
    if (!parsed) return { ok: false, error: "A IA não retornou um resumo válido. Tente de novo." };
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, error: "Falha ao gerar o resumo. Tente de novo em instantes." };
  }
}

/** Extrai o JSON do texto (tolera cercas ```json ... ```) e valida os campos. */
function parseResumo(text: string): LeadResumo | null {
  const jsonStr = text.replace(/```json\s*|\s*```/g, "").trim();
  const start = jsonStr.indexOf("{");
  const end = jsonStr.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    const obj = JSON.parse(jsonStr.slice(start, end + 1)) as Partial<LeadResumo>;
    if (typeof obj.resumo !== "string" || typeof obj.proximaAcao !== "string") return null;
    const prob = Math.max(0, Math.min(100, Math.round(Number(obj.probabilidade))));
    return {
      resumo: obj.resumo.trim(),
      probabilidade: Number.isFinite(prob) ? prob : 50,
      proximaAcao: obj.proximaAcao.trim(),
    };
  } catch {
    return null;
  }
}
