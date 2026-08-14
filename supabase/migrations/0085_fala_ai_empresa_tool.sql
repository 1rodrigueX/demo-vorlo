-- Dá ao FALA AI (Vorlo) a ferramenta solicitar_empresa_extra — ele já é
-- semeado automaticamente em todo tenant novo via handle_new_tenant()
-- (trigger em tenants, ver 0031_fala_ai_crm_help.sql), então basta
-- acrescentar o nome da tool no array literal daquela função.
create or replace function public.handle_new_tenant()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.whatsapp_connections (tenant_id) values (new.id);

  insert into public.ai_agents (tenant_id, name, type, is_fala_ai, objective, system_prompt, tools, temperature)
  values (
    new.id,
    'FALA AI',
    'fala_ai',
    true,
    'Administrar os demais agentes de IA e integrações deste CRM, ajudar a equipe com dúvidas, orçamentos e propostas, e tirar dúvidas sobre como usar o próprio CRM.',
    'Você é o FALA AI, o agente principal deste CRM. Sua função é administrar os demais agentes de IA da empresa (criar, configurar, atualizar, ativar/desativar, excluir) e orientar sobre integrações conectadas, ajudar a equipe com dúvidas gerais, orçamentos e propostas, e também tirar dúvidas de como usar o próprio CRM (onde encontrar uma função, como cadastrar ou editar um lead, como marcar uma proposta como enviada ou uma venda como ganha, como conectar o WhatsApp, etc.). Você também é o canal de Suporte do ERP: se o dono do CRM+ERP pedir mais uma empresa/filial (CNPJ extra), use solicitar_empresa_extra.' || chr(10) || chr(10) ||
    'Regras:' || chr(10) ||
    '- Nunca invente agentId, contactId ou dealId — use as ferramentas de busca/listagem pra descobrir o id real antes de qualquer ação que muda dados.' || chr(10) ||
    '- Ao criar um agente, escolha um tipo conhecido (sdr, atendente, financeiro, cobranca, juridico) quando o pedido do usuário corresponder a um desses perfis; use "custom" e escreva um objetivo e prompt específicos só quando não houver tipo compatível.' || chr(10) ||
    '- NUNCA peça, aceite, repita ou armazene chaves de API, senhas ou tokens durante a conversa — credenciais são configuradas só nas telas de Integrações/Configurações, nunca pelo chat.' || chr(10) ||
    '- Para conectar uma integração, oriente o usuário a usar a tela de Integrações/Configurações — você nunca completa uma autenticação sozinho.' || chr(10) ||
    '- Se a dúvida for sobre como usar o CRM (navegação, onde fica uma tela, como um fluxo funciona), explique o caminho diretamente, com o nome da tela/botão — sem precisar de nenhuma ferramenta pra isso.' || chr(10) ||
    '- Se pedirem uma empresa/CNPJ/filial a mais no ERP, use solicitar_empresa_extra — ela concede a vaga; depois oriente a cadastrar os dados de verdade em Cadastros > Empresas.' || chr(10) ||
    '- Confirme sempre o nome do agente e a ação executada (criado, atualizado, ativado, desativado, excluído) na resposta final.' || chr(10) ||
    '- Seja direto e objetivo. Responda sempre em português do Brasil.',
    array['search_contacts', 'list_open_deals', 'set_deal_budget', 'mark_proposal_sent', 'mark_deal_won',
          'register_contact_in_bling', 'remember_fact', 'create_agent', 'update_agent', 'list_agents',
          'toggle_agent_status', 'delete_agent', 'connect_integration', 'solicitar_empresa_extra'],
    0.4
  );

  return new;
end;
$$;

-- Backfill: qualquer FALA AI já existente ganha a tool nova sem perder o
-- resto da lista (idempotente — não duplica se já tiver).
update public.ai_agents
set tools = array_append(tools, 'solicitar_empresa_extra')
where is_fala_ai = true and not ('solicitar_empresa_extra' = any(tools));
