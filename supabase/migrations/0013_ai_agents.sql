-- Motor de agentes de IA multi-tenant: cada empresa tem seus próprios agentes,
-- isolados por RLS igual a todo o resto do schema. O FALA AI é o agente
-- principal, criado automaticamente pra todo tenant (novo ou existente) e
-- responsável por administrar os demais agentes via conversa natural.
create table public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  type text not null check (
    type in ('fala_ai', 'sdr', 'atendente', 'financeiro', 'cobranca', 'juridico', 'custom')
  ),
  is_fala_ai boolean not null default false,
  objective text not null default '',
  system_prompt text not null,
  model text not null default 'claude-opus-4-8',
  temperature numeric(3, 2) not null default 0.70 check (temperature >= 0 and temperature <= 1),
  tools text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Só 1 FALA AI por tenant.
create unique index ai_agents_one_fala_ai_per_tenant_idx
  on public.ai_agents (tenant_id) where is_fala_ai;

create index ai_agents_tenant_idx on public.ai_agents (tenant_id);

alter table public.ai_agents enable row level security;

-- Qualquer membro do tenant pode ver e conversar com os agentes ativos
-- (mesma lógica de hoje, onde qualquer vendedor usa o assistente); só
-- owner/manager pode criar, editar, ativar/desativar ou excluir.
create policy "ai_agents_select_own_tenant"
  on public.ai_agents for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "ai_agents_insert_admin"
  on public.ai_agents for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "ai_agents_update_admin"
  on public.ai_agents for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin())
  with check (tenant_id = public.current_tenant_id());

-- Nunca deixa apagar o FALA AI pelo próprio RLS (defesa em profundidade além
-- do guard na tool/action) — sem ele o tenant perde o agente administrador.
create policy "ai_agents_delete_admin"
  on public.ai_agents for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin() and not is_fala_ai);

create trigger set_updated_at
  before update on public.ai_agents
  for each row execute function public.set_updated_at();

-- Prompt padrão do FALA AI para tenants novos e para o backfill abaixo. Fica
-- duplicado com src/lib/ai-agents/templates.ts (Postgres não importa TS) —
-- editar o prompt depois exige uma nova migration pra propagar aos tenants
-- futuros, é uma limitação conhecida e documentada.
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
    'Administrar os demais agentes de IA e integrações deste CRM, e ajudar a equipe com dúvidas, orçamentos e propostas.',
    'Você é o FALA AI, o agente principal deste CRM. Sua função é administrar os demais agentes de IA da empresa (criar, configurar, atualizar, ativar/desativar, excluir) e orientar sobre integrações conectadas, além de ajudar a equipe com dúvidas gerais, orçamentos e propostas.' || chr(10) || chr(10) ||
    'Regras:' || chr(10) ||
    '- Nunca invente agentId, contactId ou dealId — use as ferramentas de busca/listagem pra descobrir o id real antes de qualquer ação que muda dados.' || chr(10) ||
    '- Ao criar um agente, escolha um tipo conhecido (sdr, atendente, financeiro, cobranca, juridico) quando o pedido do usuário corresponder a um desses perfis; use "custom" e escreva um objetivo e prompt específicos só quando não houver tipo compatível.' || chr(10) ||
    '- NUNCA peça, aceite, repita ou armazene chaves de API, senhas ou tokens durante a conversa — credenciais são configuradas só nas telas de Integrações/Configurações, nunca pelo chat.' || chr(10) ||
    '- Para conectar uma integração, oriente o usuário a usar a tela de Integrações/Configurações — você nunca completa uma autenticação sozinho.' || chr(10) ||
    '- Confirme sempre o nome do agente e a ação executada (criado, atualizado, ativado, desativado, excluído) na resposta final.' || chr(10) ||
    '- Seja direto e objetivo. Responda sempre em português do Brasil.',
    array['search_contacts', 'list_open_deals', 'set_deal_budget', 'mark_proposal_sent', 'mark_deal_won',
          'register_contact_in_bling', 'remember_fact', 'create_agent', 'update_agent', 'list_agents',
          'toggle_agent_status', 'delete_agent', 'connect_integration'],
    0.4
  );

  return new;
end;
$$;

-- Backfill: tenant(s) já existentes ganham o FALA AI agora.
insert into public.ai_agents (tenant_id, name, type, is_fala_ai, objective, system_prompt, tools, temperature)
select
  t.id,
  'FALA AI',
  'fala_ai',
  true,
  'Administrar os demais agentes de IA e integrações deste CRM, e ajudar a equipe com dúvidas, orçamentos e propostas.',
  'Você é o FALA AI, o agente principal deste CRM. Sua função é administrar os demais agentes de IA da empresa (criar, configurar, atualizar, ativar/desativar, excluir) e orientar sobre integrações conectadas, além de ajudar a equipe com dúvidas gerais, orçamentos e propostas.' || chr(10) || chr(10) ||
  'Regras:' || chr(10) ||
  '- Nunca invente agentId, contactId ou dealId — use as ferramentas de busca/listagem pra descobrir o id real antes de qualquer ação que muda dados.' || chr(10) ||
  '- Ao criar um agente, escolha um tipo conhecido (sdr, atendente, financeiro, cobranca, juridico) quando o pedido do usuário corresponder a um desses perfis; use "custom" e escreva um objetivo e prompt específicos só quando não houver tipo compatível.' || chr(10) ||
  '- NUNCA peça, aceite, repita ou armazene chaves de API, senhas ou tokens durante a conversa — credenciais são configuradas só nas telas de Integrações/Configurações, nunca pelo chat.' || chr(10) ||
  '- Para conectar uma integração, oriente o usuário a usar a tela de Integrações/Configurações — você nunca completa uma autenticação sozinho.' || chr(10) ||
  '- Confirme sempre o nome do agente e a ação executada (criado, atualizado, ativado, desativado, excluído) na resposta final.' || chr(10) ||
  '- Seja direto e objetivo. Responda sempre em português do Brasil.',
  array['search_contacts', 'list_open_deals', 'set_deal_budget', 'mark_proposal_sent', 'mark_deal_won',
        'register_contact_in_bling', 'remember_fact', 'create_agent', 'update_agent', 'list_agents',
        'toggle_agent_status', 'delete_agent', 'connect_integration'],
  0.4
from public.tenants t
where not exists (select 1 from public.ai_agents a where a.tenant_id = t.id and a.is_fala_ai);
