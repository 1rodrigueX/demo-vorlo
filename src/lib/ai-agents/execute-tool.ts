import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { setDealBudget, markProposalSent, markDealWon } from "@/lib/actions/deals";
import { createAgent, updateAgent, toggleAgentStatus, deleteAgent } from "@/lib/actions/ai-agents";
import { syncContactToBling } from "@/lib/bling/sync";
import { formatCurrency } from "@/lib/utils/currency";
import { daysSinceNow } from "@/lib/utils/dates";
import { rememberFactSchema } from "@/lib/validation/ai-agent";
import { CREATABLE_AGENT_TYPES } from "@/lib/ai-agents/templates";

type Supabase = SupabaseClient<Database>;
type AgentContext = { id: string; is_fala_ai: boolean };

const INTEGRATION_GUIDANCE: Record<string, string> = {
  anthropic: "A chave da Anthropic já pode ser conectada em Configurações > Inteligência Artificial.",
  bling: "O Bling já pode ser conectado em Configurações > Bling.",
  gmail: "O Gmail já pode ser conectado em Configurações > E-mail — é só clicar em Conectar e fazer login com a conta Google.",
  outlook: "O Outlook já pode ser conectado em Configurações > E-mail — é só clicar em Conectar e fazer login com a conta Microsoft.",
  google_calendar:
    "O Google Agenda ainda não está disponível nesta versão do CRM — em breve você poderá conectá-lo na tela de Integrações.",
  microsoft365:
    "O Microsoft 365 ainda não está disponível nesta versão do CRM — em breve você poderá conectá-lo na tela de Integrações.",
  custom: "APIs personalizadas ainda não estão disponíveis nesta versão do CRM.",
};

export async function executeAgentTool(
  supabase: Supabase,
  tenantId: string,
  agent: AgentContext,
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

        return { content: `Orçamento de ${formatCurrency(value)} salvo. dealId=${result.dealId}`, isError: false };
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

      case "register_contact_in_bling": {
        const contactId = String(input.contactId ?? "");
        if (!contactId) return { content: "contactId é obrigatório", isError: true };

        const { data: contact, error } = await supabase
          .from("contacts")
          .select(
            "id, name, phone, email, bling_contact_id, cpf_cnpj, address_zip, address_street, address_number, address_complement, address_neighborhood, address_city, address_state",
          )
          .eq("id", contactId)
          .single();

        if (error || !contact) return { content: "Contato não encontrado", isError: true };

        if (contact.bling_contact_id) {
          return {
            content: `${contact.name} já está cadastrado no Bling (id ${contact.bling_contact_id}).`,
            isError: false,
          };
        }

        const result = await syncContactToBling(tenantId, {
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          cpfCnpj: contact.cpf_cnpj,
          address: {
            zip: contact.address_zip,
            street: contact.address_street,
            number: contact.address_number,
            complement: contact.address_complement,
            neighborhood: contact.address_neighborhood,
            city: contact.address_city,
            state: contact.address_state,
          },
        });

        if (!result.success) {
          return { content: `Não foi possível cadastrar no Bling: ${result.error}`, isError: true };
        }

        return { content: `${contact.name} cadastrado no Bling com sucesso (id ${result.blingId}).`, isError: false };
      }

      case "remember_fact": {
        const parsed = rememberFactSchema.safeParse(input);
        if (!parsed.success) {
          return { content: parsed.error.issues[0]?.message ?? "Dados inválidos", isError: true };
        }

        const { data: existing } = await supabase
          .from("ai_agent_memory")
          .select("id")
          .eq("agent_id", agent.id)
          .eq("label", parsed.data.label)
          .maybeSingle();

        const { error } = existing
          ? await supabase
              .from("ai_agent_memory")
              .update({ content: parsed.data.content, updated_at: new Date().toISOString() })
              .eq("id", existing.id)
          : await supabase.from("ai_agent_memory").insert({
              tenant_id: tenantId,
              agent_id: agent.id,
              label: parsed.data.label,
              content: parsed.data.content,
            });

        if (error) return { content: `Não foi possível salvar na memória: ${error.message}`, isError: true };
        return { content: `Anotado: ${parsed.data.label} = ${parsed.data.content}`, isError: false };
      }

      case "create_agent": {
        if (!agent.is_fala_ai) return { content: "Só o FALA AI pode criar agentes.", isError: true };

        const type = String(input.type ?? "");
        if (!CREATABLE_AGENT_TYPES.includes(type as (typeof CREATABLE_AGENT_TYPES)[number])) {
          return { content: `Tipo de agente inválido: ${type}`, isError: true };
        }

        const result = await createAgent({
          name: String(input.name ?? ""),
          type: type as (typeof CREATABLE_AGENT_TYPES)[number],
          objective: input.objective ? String(input.objective) : undefined,
          systemPrompt: input.systemPrompt ? String(input.systemPrompt) : undefined,
        });

        if (result.error || !result.data) {
          return { content: result.error ?? "Não foi possível criar o agente", isError: true };
        }

        return {
          content: `Agente "${result.data.name}" criado (tipo ${result.data.type}, agentId=${result.data.agentId}). Já aparece em Agentes IA.`,
          isError: false,
        };
      }

      case "update_agent": {
        if (!agent.is_fala_ai) return { content: "Só o FALA AI pode atualizar agentes.", isError: true };

        const agentId = String(input.agentId ?? "");
        if (!agentId) return { content: "agentId é obrigatório (use list_agents pra descobrir)", isError: true };

        const result = await updateAgent(agentId, {
          name: input.name ? String(input.name) : undefined,
          objective: input.objective ? String(input.objective) : undefined,
          systemPrompt: input.systemPrompt ? String(input.systemPrompt) : undefined,
          temperature: typeof input.temperature === "number" ? input.temperature : undefined,
        });

        if (result.error || !result.data) {
          return { content: result.error ?? "Não foi possível atualizar o agente", isError: true };
        }

        return { content: `Agente "${result.data.name}" atualizado.`, isError: false };
      }

      case "list_agents": {
        if (!agent.is_fala_ai) return { content: "Só o FALA AI pode listar agentes.", isError: true };

        const { data, error } = await supabase
          .from("ai_agents")
          .select("id, name, type, status")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: true });

        if (error) return { content: `Erro ao listar agentes: ${error.message}`, isError: true };
        if (!data?.length) return { content: "Nenhum agente cadastrado ainda.", isError: false };

        const lines = data.map((a) => `agentId=${a.id} | ${a.name} (${a.type}) | ${a.status}`);
        return { content: lines.join("\n"), isError: false };
      }

      case "toggle_agent_status": {
        if (!agent.is_fala_ai) return { content: "Só o FALA AI pode ativar/desativar agentes.", isError: true };

        const agentId = String(input.agentId ?? "");
        const status = String(input.status ?? "");
        if (!agentId || (status !== "active" && status !== "inactive")) {
          return { content: "agentId e status ('active' ou 'inactive') são obrigatórios", isError: true };
        }

        const result = await toggleAgentStatus(agentId, status);
        if (result.error || !result.data) {
          return { content: result.error ?? "Não foi possível atualizar o status", isError: true };
        }

        return {
          content: `Agente "${result.data.name}" agora está ${result.data.status === "active" ? "ativo" : "inativo"}.`,
          isError: false,
        };
      }

      case "delete_agent": {
        if (!agent.is_fala_ai) return { content: "Só o FALA AI pode excluir agentes.", isError: true };

        const agentId = String(input.agentId ?? "");
        if (!agentId) return { content: "agentId é obrigatório (use list_agents pra descobrir)", isError: true };

        const result = await deleteAgent(agentId);
        if (result.error || !result.data) {
          return { content: result.error ?? "Não foi possível excluir o agente", isError: true };
        }

        return { content: `Agente "${result.data.name}" excluído.`, isError: false };
      }

      case "connect_integration": {
        if (!agent.is_fala_ai) return { content: "Só o FALA AI pode orientar sobre integrações.", isError: true };

        const provider = String(input.provider ?? "");
        const guidance = INTEGRATION_GUIDANCE[provider];
        if (!guidance) return { content: `Integração desconhecida: ${provider}`, isError: true };
        return { content: guidance, isError: false };
      }

      case "check_integration_status": {
        if (!agent.is_fala_ai) return { content: "Só o FALA AI pode checar status de integrações.", isError: true };

        const provider = String(input.provider ?? "");

        if (provider === "bling") {
          const { data: connections } = await supabase
            .from("bling_connections")
            .select("name, is_default, access_token, expires_at")
            .eq("tenant_id", tenantId);

          if (!connections?.length) return { content: "Bling: nenhuma conexão cadastrada ainda.", isError: false };

          const summary = connections
            .map((c) => {
              const label = c.is_default ? "padrão" : "filial";
              if (!c.access_token) return `${c.name} (${label}): desconectado`;
              const expired = c.expires_at ? new Date(c.expires_at).getTime() < Date.now() : false;
              return `${c.name} (${label}): ${expired ? "token expirado, precisa reconectar" : "conectado"}`;
            })
            .join("; ");
          return { content: `Bling: ${summary}`, isError: false };
        }

        if (provider === "anthropic" || provider === "gmail" || provider === "outlook") {
          const { data } = await supabase
            .from("tenant_integrations")
            .select("status, last_error, last_tested_at")
            .eq("tenant_id", tenantId)
            .eq("provider", provider)
            .maybeSingle();

          if (!data) return { content: `${provider}: nenhuma conexão cadastrada ainda.`, isError: false };

          const label =
            data.status === "connected"
              ? "conectada"
              : data.status === "error"
                ? `com erro (${data.last_error ?? "motivo desconhecido"})`
                : "desconectada";
          const tested = data.last_tested_at ? `, último teste em ${data.last_tested_at}` : "";
          return { content: `${provider}: ${label}${tested}`, isError: false };
        }

        return { content: `Integração desconhecida: ${provider}`, isError: true };
      }

      default:
        return { content: `Ferramenta desconhecida: ${name}`, isError: true };
    }
  } catch (err) {
    console.error(`executeAgentTool(${name}) falhou:`, err);
    return { content: "Erro inesperado ao executar a ação", isError: true };
  }
}
