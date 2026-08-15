import "server-only";
import type OpenAI from "openai";

type ChatTool = OpenAI.Chat.Completions.ChatCompletionTool;

/**
 * Registro central de todas as ferramentas possíveis (as de negócio + as
 * exclusivas do Vorlo), no formato de function calling da OpenAI:
 * `{ type: "function", function: { name, description, parameters } }`.
 * (Na Anthropic era `{ name, description, input_schema }` no nível de cima —
 * o JSON Schema em si é o mesmo, só a embalagem muda.)
 */
export const AGENT_TOOL_REGISTRY: Record<string, ChatTool> = {
  search_contacts: {
    type: "function",
    function: {
      name: "search_contacts",
      description:
        "Busca contatos do CRM pelo nome, telefone ou empresa. Use para descobrir o contactId/dealId antes de salvar " +
        "orçamento, marcar proposta enviada ou marcar venda ganha.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nome, telefone ou parte do nome da empresa" },
        },
        required: ["query"],
      },
    },
  },
  list_open_deals: {
    type: "function",
    function: {
      name: "list_open_deals",
      description:
        "Lista os negócios em aberto (leads com chance de fechar), incluindo quais já têm proposta enviada e há " +
        "quantos dias.",
      parameters: { type: "object", properties: {} },
    },
  },
  set_deal_budget: {
    type: "function",
    function: {
      name: "set_deal_budget",
      description: "Salva (cria ou atualiza) o valor da proposta/orçamento de um negócio vinculado a um contato.",
      parameters: {
        type: "object",
        properties: {
          contactId: { type: "string", description: "id do contato (uuid)" },
          dealId: {
            type: "string",
            description: "id do negócio existente (uuid), se já houver um. Deixe vazio para criar um novo.",
          },
          value: { type: "number", description: "valor da proposta em reais, ex: 1500.50" },
        },
        required: ["contactId", "value"],
      },
    },
  },
  mark_proposal_sent: {
    type: "function",
    function: {
      name: "mark_proposal_sent",
      description: "Marca que a proposta de um negócio foi enviada ao cliente agora.",
      parameters: {
        type: "object",
        properties: { dealId: { type: "string", description: "id do negócio (uuid)" } },
        required: ["dealId"],
      },
    },
  },
  mark_deal_won: {
    type: "function",
    function: {
      name: "mark_deal_won",
      description: "Marca um negócio como venda ganha.",
      parameters: {
        type: "object",
        properties: { dealId: { type: "string", description: "id do negócio (uuid)" } },
        required: ["dealId"],
      },
    },
  },
  register_contact_in_bling: {
    type: "function",
    function: {
      name: "register_contact_in_bling",
      description: "Cadastra um contato como cliente no Bling (ERP), se este CRM estiver conectado ao Bling.",
      parameters: {
        type: "object",
        properties: { contactId: { type: "string", description: "id do contato (uuid)" } },
        required: ["contactId"],
      },
    },
  },
  remember_fact: {
    type: "function",
    function: {
      name: "remember_fact",
      description:
        "Registra um fato/preferência importante pra você mesmo lembrar em conversas futuras (ex: 'horário de " +
        "atendimento: 9h-18h'). Se já existir um fato com o mesmo label, ele é atualizado em vez de duplicado.",
      parameters: {
        type: "object",
        properties: {
          label: { type: "string", description: "rótulo curto do fato, ex: 'horario_atendimento'" },
          content: { type: "string", description: "o fato em si" },
        },
        required: ["label", "content"],
      },
    },
  },
  create_agent: {
    type: "function",
    function: {
      name: "create_agent",
      description:
        "Cria um novo agente de IA pro tenant. Use type='sdr'|'atendente'|'financeiro'|'cobranca'|'juridico' pra " +
        "aplicar um template pronto, ou type='custom' e informe objective+systemPrompt pra um agente sob medida. " +
        "Só o Vorlo pode chamar esta ferramenta.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "nome do agente, ex: 'SDR' ou 'Ana'" },
          type: {
            type: "string",
            enum: ["sdr", "atendente", "financeiro", "cobranca", "juridico", "custom"],
          },
          objective: { type: "string", description: "objetivo do agente (obrigatório se type='custom')" },
          systemPrompt: { type: "string", description: "prompt do agente (obrigatório se type='custom')" },
        },
        required: ["name", "type"],
      },
    },
  },
  update_agent: {
    type: "function",
    function: {
      name: "update_agent",
      description:
        "Atualiza nome, objetivo, prompt, ferramentas ou temperatura de um agente já existente. Sempre descubra o " +
        "agentId com list_agents antes de chamar esta ferramenta. Só o Vorlo pode chamar esta ferramenta.",
      parameters: {
        type: "object",
        properties: {
          agentId: { type: "string", description: "id do agente (uuid), descoberto via list_agents" },
          name: { type: "string" },
          objective: { type: "string" },
          systemPrompt: { type: "string" },
          temperature: { type: "number", description: "entre 0 e 1" },
        },
        required: ["agentId"],
      },
    },
  },
  list_agents: {
    type: "function",
    function: {
      name: "list_agents",
      description:
        "Lista os agentes de IA deste tenant, com id, nome, tipo e status. Só o Vorlo pode chamar esta ferramenta.",
      parameters: { type: "object", properties: {} },
    },
  },
  toggle_agent_status: {
    type: "function",
    function: {
      name: "toggle_agent_status",
      description:
        "Ativa ou desativa um agente existente. Sempre descubra o agentId com list_agents antes. Não é possível " +
        "desativar o próprio Vorlo. Só o Vorlo pode chamar esta ferramenta.",
      parameters: {
        type: "object",
        properties: {
          agentId: { type: "string", description: "id do agente (uuid)" },
          status: { type: "string", enum: ["active", "inactive"] },
        },
        required: ["agentId", "status"],
      },
    },
  },
  delete_agent: {
    type: "function",
    function: {
      name: "delete_agent",
      description:
        "Exclui um agente definitivamente (apaga também suas mensagens, memória e logs). Sempre descubra o agentId " +
        "com list_agents e confirme com o usuário antes de excluir. Não é possível excluir o próprio Vorlo. Só o " +
        "Vorlo pode chamar esta ferramenta.",
      parameters: {
        type: "object",
        properties: { agentId: { type: "string", description: "id do agente (uuid)" } },
        required: ["agentId"],
      },
    },
  },
  connect_integration: {
    type: "function",
    function: {
      name: "connect_integration",
      description:
        "Informa como conectar uma integração (Bling, OpenAI, Gmail, Outlook, Google Agenda, Microsoft 365). Você " +
        "nunca completa a conexão sozinho — só orienta onde configurar. Só o Vorlo pode chamar esta ferramenta.",
      parameters: {
        type: "object",
        properties: {
          provider: {
            type: "string",
            enum: ["openai", "bling", "gmail", "outlook", "google_calendar", "microsoft365", "youtube", "custom"],
          },
        },
        required: ["provider"],
      },
    },
  },
  solicitar_empresa_extra: {
    type: "function",
    function: {
      name: "solicitar_empresa_extra",
      description:
        "Concede ao tenant deste CRM+ERP uma vaga a mais pra cadastrar outra empresa/CNPJ/filial (a 1ª é sempre " +
        "grátis; isso libera a próxima). Não pede nem preenche os dados da empresa — só abre a vaga; o dono " +
        "cadastra CNPJ/razão social/regime tributário de verdade depois em Cadastros > Empresas. Só o Vorlo pode " +
        "chamar esta ferramenta.",
      parameters: { type: "object", properties: {} },
    },
  },
  check_integration_status: {
    type: "function",
    function: {
      name: "check_integration_status",
      description:
        "Consulta no banco se uma integração (Bling, OpenAI, Gmail, Outlook) está realmente conectada agora — " +
        "token presente, válido e sem erro no último teste. Use isso pra responder se uma API 'está on ou não', em " +
        "vez de dizer que não tem como saber. Não é um teste ao vivo, é o status salvo da última conexão/teste. Só o " +
        "Vorlo pode chamar esta ferramenta.",
      parameters: {
        type: "object",
        properties: {
          provider: {
            type: "string",
            enum: ["openai", "bling", "gmail", "outlook"],
          },
        },
        required: ["provider"],
      },
    },
  },
};

export function getToolsForAgent(toolKeys: string[]): ChatTool[] {
  return toolKeys.map((key) => AGENT_TOOL_REGISTRY[key]).filter((tool): tool is ChatTool => Boolean(tool));
}
