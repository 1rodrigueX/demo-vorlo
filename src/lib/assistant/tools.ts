import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { setDealBudget, markProposalSent, markDealWon } from "@/lib/actions/deals";
import { formatCurrency } from "@/lib/utils/currency";
import { daysSinceNow } from "@/lib/utils/dates";

type Supabase = SupabaseClient<Database>;

export const assistantTools: Anthropic.Tool[] = [
  {
    name: "search_contacts",
    description:
      "Busca contatos do vendedor pelo nome, telefone ou empresa. Use para descobrir o contactId/dealId antes de salvar orçamento, marcar proposta enviada ou marcar venda ganha.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Nome, telefone ou parte do nome da empresa" },
      },
      required: ["query"],
    },
  },
  {
    name: "list_open_deals",
    description:
      "Lista os negócios em aberto do vendedor (leads com chance de fechar), incluindo quais já têm proposta enviada e há quantos dias. Use para responder perguntas gerais sobre a carteira do vendedor.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "set_deal_budget",
    description:
      "Salva (cria ou atualiza) o valor da proposta/orçamento de um negócio vinculado a um contato.",
    input_schema: {
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
  {
    name: "mark_proposal_sent",
    description: "Marca que a proposta de um negócio foi enviada ao cliente agora.",
    input_schema: {
      type: "object",
      properties: {
        dealId: { type: "string", description: "id do negócio (uuid)" },
      },
      required: ["dealId"],
    },
  },
  {
    name: "mark_deal_won",
    description: "Marca um negócio como venda ganha.",
    input_schema: {
      type: "object",
      properties: {
        dealId: { type: "string", description: "id do negócio (uuid)" },
      },
      required: ["dealId"],
    },
  },
];

export async function executeAssistantTool(
  supabase: Supabase,
  name: string,
  input: Record<string, unknown>,
): Promise<{ content: string; isError: boolean }> {
  try {
    switch (name) {
      case "search_contacts": {
        const query = String(input.query ?? "").trim();
        if (!query) return { content: "Informe um termo de busca", isError: true };

        const { data, error } = await supabase
          .from("contacts")
          .select("id, name, phone, email, company:companies(name), deals(id, title, value, status, proposal_sent_at)")
          .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
          .limit(8);

        if (error) return { content: `Erro ao buscar contatos: ${error.message}`, isError: true };
        if (!data?.length) return { content: "Nenhum contato encontrado com esse termo.", isError: false };

        const lines = data.map((c) => {
          const company = Array.isArray(c.company) ? c.company[0] : c.company;
          const openDeals = (c.deals ?? []).filter((d) => d.status === "open");
          const dealsText = openDeals.length
            ? openDeals
                .map(
                  (d) =>
                    `dealId=${d.id} (${d.title}, ${formatCurrency(Number(d.value))}${
                      d.proposal_sent_at ? ", proposta já enviada" : ", sem proposta enviada"
                    })`,
                )
                .join("; ")
            : "sem negócios em aberto";
          return `contactId=${c.id} | ${c.name}${c.phone ? ` (${c.phone})` : ""}${
            company ? ` — empresa: ${company.name}` : ""
          } | ${dealsText}`;
        });

        return { content: lines.join("\n"), isError: false };
      }

      case "list_open_deals": {
        const { data, error } = await supabase
          .from("deals")
          .select("id, title, value, proposal_sent_at, contact:contacts(name)")
          .eq("status", "open")
          .order("created_at", { ascending: true });

        if (error) return { content: `Erro ao listar negócios: ${error.message}`, isError: true };
        if (!data?.length) return { content: "Não há negócios em aberto no momento.", isError: false };

        const lines = data.map((d) => {
          const contact = Array.isArray(d.contact) ? d.contact[0] : d.contact;
          const status = d.proposal_sent_at
            ? `proposta enviada há ${daysSinceNow(d.proposal_sent_at)} dia(s)`
            : "proposta ainda não enviada";
          return `dealId=${d.id} | ${contact?.name ?? d.title} | ${formatCurrency(Number(d.value))} | ${status}`;
        });

        return { content: lines.join("\n"), isError: false };
      }

      case "set_deal_budget": {
        const contactId = String(input.contactId ?? "");
        const dealId = input.dealId ? String(input.dealId) : null;
        const value = Number(input.value);
        if (!contactId || !Number.isFinite(value)) {
          return { content: "contactId e value são obrigatórios", isError: true };
        }

        const result = await setDealBudget(contactId, dealId, value);
        if (result.error) return { content: result.error, isError: true };

        return {
          content: `Orçamento de ${formatCurrency(value)} salvo. dealId=${result.dealId}`,
          isError: false,
        };
      }

      case "mark_proposal_sent": {
        const dealId = String(input.dealId ?? "");
        if (!dealId) return { content: "dealId é obrigatório", isError: true };

        const result = await markProposalSent(dealId);
        if (result.error) return { content: result.error, isError: true };
        return { content: "Proposta marcada como enviada.", isError: false };
      }

      case "mark_deal_won": {
        const dealId = String(input.dealId ?? "");
        if (!dealId) return { content: "dealId é obrigatório", isError: true };

        const result = await markDealWon(dealId);
        if (result.error) return { content: result.error, isError: true };
        return { content: "Negócio marcado como venda ganha! 🎉", isError: false };
      }

      default:
        return { content: `Ferramenta desconhecida: ${name}`, isError: true };
    }
  } catch (err) {
    console.error(`executeAssistantTool(${name}) falhou:`, err);
    return { content: "Erro inesperado ao executar a ação", isError: true };
  }
}
