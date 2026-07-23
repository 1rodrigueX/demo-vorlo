import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Métricas de conversa/atendimento pro topo da dashboard (estilo Kommo):
 * mensagens recebidas, conversas em andamento / não respondidas, tempo de
 * resposta e maior tempo de espera, além das fontes de lead.
 *
 * Fonte hoje: whatsapp_messages (único canal existente). A quebra por canal
 * já vem preparada — quando o omnichannel (fase 2c) adicionar messages.channel,
 * é só somar por canal aqui em vez de jogar tudo em "WhatsApp".
 *
 * Observação de escala: a análise de estado das conversas (não respondidas,
 * tempo de resposta, espera) roda sobre as mensagens do período com um teto
 * de linhas — é uma aproximação boa pra volumes normais; se um dia precisar
 * ser exato em alto volume, vira uma função SQL (RPC).
 */

const ANALYSIS_ROW_CAP = 1000;

export type LeadSource = { source: string; count: number };

export type ConversationMetrics = {
  messagesReceived: number;
  messagesByChannel: { label: string; value: number; color: string }[];
  conversationsActive: number;
  conversationsUnanswered: number;
  avgResponseMinutes: number | null;
  longestWaitingMinutes: number | null;
  leadSources: LeadSource[];
};

function emptyMetrics(): ConversationMetrics {
  return {
    messagesReceived: 0,
    messagesByChannel: [
      { label: "WhatsApp", value: 0, color: "#25D366" },
      { label: "Bate-papo online", value: 0, color: "var(--color-indigo-500)" },
      { label: "Outros", value: 0, color: "var(--color-gray-400)" },
    ],
    conversationsActive: 0,
    conversationsUnanswered: 0,
    avgResponseMinutes: null,
    longestWaitingMinutes: null,
    leadSources: [],
  };
}

export async function getConversationMetrics(
  supabase: SupabaseClient<Database>,
  filters: { from: Date; to: Date; ownerId: string | null },
): Promise<ConversationMetrics> {
  const { from, to, ownerId } = filters;

  // Filtro de vendedor = contatos criados por ele (mensagens não têm dono).
  let contactIds: string[] | null = null;
  if (ownerId) {
    const { data } = await supabase.from("contacts").select("id").eq("created_by", ownerId);
    contactIds = (data ?? []).map((c) => c.id);
    if (contactIds.length === 0) return emptyMetrics();
  }

  // Contagem exata de recebidas (query separada — não sofre com o teto de linhas).
  let receivedQuery = supabase
    .from("whatsapp_messages")
    .select("id", { count: "exact", head: true })
    .eq("direction", "inbound")
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString());
  if (contactIds) receivedQuery = receivedQuery.in("contact_id", contactIds);
  const { count: receivedCount } = await receivedQuery;
  const messagesReceived = receivedCount ?? 0;

  // Linhas pra análise de estado (mais recentes primeiro, com teto).
  let rowsQuery = supabase
    .from("whatsapp_messages")
    .select("contact_id, direction, created_at")
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .order("created_at", { ascending: false })
    .limit(ANALYSIS_ROW_CAP);
  if (contactIds) rowsQuery = rowsQuery.in("contact_id", contactIds);
  const { data: rows } = await rowsQuery;

  const byContact = new Map<string, { direction: string; created_at: string }[]>();
  for (const m of rows ?? []) {
    const arr = byContact.get(m.contact_id) ?? [];
    arr.push({ direction: m.direction, created_at: m.created_at });
    byContact.set(m.contact_id, arr);
  }

  let conversationsUnanswered = 0;
  const responseDeltasMs: number[] = [];
  const waitingMs: number[] = [];
  const now = Date.now();

  for (const arr of byContact.values()) {
    // Veio desc; ordena asc pra ler a conversa em ordem cronológica.
    arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i].direction !== "inbound") continue;
      // Primeira resposta outbound depois desse inbound (para no próximo inbound).
      for (let j = i + 1; j < arr.length; j++) {
        if (arr[j].direction === "outbound") {
          responseDeltasMs.push(new Date(arr[j].created_at).getTime() - new Date(arr[i].created_at).getTime());
          break;
        }
        if (arr[j].direction === "inbound") break;
      }
    }

    const last = arr[arr.length - 1];
    if (last.direction === "inbound") {
      conversationsUnanswered++;
      waitingMs.push(now - new Date(last.created_at).getTime());
    }
  }

  const conversationsActive = byContact.size;
  const avgResponseMinutes = responseDeltasMs.length
    ? Math.round(responseDeltasMs.reduce((a, b) => a + b, 0) / responseDeltasMs.length / 60000)
    : null;
  const longestWaitingMinutes = waitingMs.length ? Math.round(Math.max(...waitingMs) / 60000) : null;

  // Fontes de lead dos contatos criados no período.
  let sourcesQuery = supabase
    .from("contacts")
    .select("lead_source")
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString());
  if (ownerId) sourcesQuery = sourcesQuery.eq("created_by", ownerId);
  const { data: sourceRows } = await sourcesQuery;

  const sourceCounts = new Map<string, number>();
  for (const r of sourceRows ?? []) {
    const s = (r.lead_source ?? "").trim() || "Não informado";
    sourceCounts.set(s, (sourceCounts.get(s) ?? 0) + 1);
  }
  const leadSources = [...sourceCounts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  return {
    messagesReceived,
    messagesByChannel: [
      { label: "WhatsApp", value: messagesReceived, color: "#25D366" },
      { label: "Bate-papo online", value: 0, color: "var(--color-indigo-500)" },
      { label: "Outros", value: 0, color: "var(--color-gray-400)" },
    ],
    conversationsActive,
    conversationsUnanswered,
    avgResponseMinutes,
    longestWaitingMinutes,
    leadSources,
  };
}
