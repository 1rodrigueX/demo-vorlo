import type { AgentType } from "@/types/domain";

/** Todas as ferramentas que um agente pode ter habilitadas (menos as exclusivas do Vorlo). */
export const ALL_TOOL_KEYS = [
  "search_contacts",
  "list_open_deals",
  "set_deal_budget",
  "mark_proposal_sent",
  "mark_deal_won",
  "register_contact_in_bling",
  "remember_fact",
] as const;

/** Ferramentas que só o Vorlo pode usar (administram outros agentes/integrações). */
export const FALA_AI_ONLY_TOOL_KEYS = [
  "create_agent",
  "update_agent",
  "list_agents",
  "toggle_agent_status",
  "delete_agent",
  "connect_integration",
  "check_integration_status",
] as const;

export const KNOWN_TOOL_KEYS = [...ALL_TOOL_KEYS, ...FALA_AI_ONLY_TOOL_KEYS] as const;

export const CREATABLE_AGENT_TYPES = ["sdr", "atendente", "financeiro", "cobranca", "juridico", "custom"] as const;

type AgentTemplate = {
  objective: string;
  systemPrompt: string;
  tools: readonly string[];
  temperature: number;
};

/** Configuração default aplicada quando o Vorlo (ou a tela de Agentes) cria um agente de um tipo conhecido. */
export const AGENT_TEMPLATES: Record<Exclude<AgentType, "fala_ai" | "custom">, AgentTemplate> = {
  sdr: {
    objective: "Qualificar leads recebidos, identificar dor e orçamento, e organizar o histórico pro vendedor assumir.",
    systemPrompt:
      "Você é um agente SDR (pré-vendas) deste CRM. Qualifique leads: entenda a necessidade, o orçamento disponível " +
      "e o momento de compra antes de indicar que o lead está pronto pra um vendedor assumir. Nunca promete desconto " +
      "ou condição especial sem confirmar com um gestor. Seja cordial, direto e sempre responda em português do Brasil.",
    tools: ["search_contacts", "list_open_deals", "set_deal_budget", "remember_fact"],
    temperature: 0.5,
  },
  atendente: {
    objective: "Responder dúvidas de clientes/leads sobre produto, prazos e status dos pedidos, com tom cordial.",
    systemPrompt:
      "Você é um agente de atendimento deste CRM. Responda dúvidas de clientes e leads sobre produto, prazos e " +
      "status de pedidos com um tom cordial e prestativo. Quando não tiver certeza da resposta, diga que vai " +
      "verificar com a equipe em vez de inventar uma informação. Responda sempre em português do Brasil.",
    tools: ["search_contacts", "list_open_deals", "remember_fact"],
    temperature: 0.6,
  },
  financeiro: {
    objective: "Tirar dúvidas sobre valores de proposta e ajudar a registrar orçamentos, sempre confirmando antes de salvar.",
    systemPrompt:
      "Você é um agente financeiro deste CRM. Ajude com dúvidas sobre valores de propostas e orçamentos. Nunca " +
      "altera um valor sem confirmar explicitamente com quem está pedindo. Priorize precisão: se não tiver certeza " +
      "de um valor, pergunte antes de agir. Responda sempre em português do Brasil.",
    tools: ["search_contacts", "list_open_deals", "set_deal_budget"],
    temperature: 0.2,
  },
  cobranca: {
    objective: "Fazer follow-up de propostas enviadas e pagamentos pendentes, lembrando prazos.",
    systemPrompt:
      "Você é um agente de cobrança deste CRM. Ajude a fazer follow-up de propostas enviadas e pagamentos " +
      "pendentes, lembrando prazos com um tom firme mas sempre cordial — nunca ameace o cliente. Responda sempre " +
      "em português do Brasil.",
    tools: ["search_contacts", "list_open_deals", "mark_proposal_sent", "remember_fact"],
    temperature: 0.3,
  },
  juridico: {
    objective: "Orientar sobre cláusulas contratuais padrão e prazos, sempre recomendando revisão humana.",
    systemPrompt:
      "Você é um agente jurídico de apoio deste CRM. Oriente sobre cláusulas contratuais padrão e prazos com base " +
      "no que estiver registrado. NUNCA dê um parecer jurídico definitivo — sempre recomende revisão de um " +
      "advogado antes de qualquer decisão importante. Responda sempre em português do Brasil.",
    tools: ["remember_fact"],
    temperature: 0.2,
  },
};
