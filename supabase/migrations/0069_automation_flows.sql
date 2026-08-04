-- Trajetórias — construtor visual de automações estilo n8n (Fase 1: só o
-- desenho + persistência; a execução vem na Fase 2 reusando a fila
-- automation_jobs + o cron run-automations, ver 0046_automation_core).
--
-- Cada trajetória é um grafo (nós + arestas) guardado em JSONB. Um nó é um
-- gatilho (lead criado, mudou de etapa, mensagem recebida) ou uma ação (enviar
-- WhatsApp, mover no funil, atribuir responsável, esperar, criar tarefa, tag).
-- O schema do grafo é validado no app (ver src/lib/automations/flow-types.ts),
-- não no banco — mantém o JSONB flexível pra evoluir os tipos de nó sem
-- migration a cada novo gatilho/ação.
create table public.automation_flows (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  description text,
  -- 'draft' = rascunho (não roda); 'active' = ligada. Na Fase 1 o toggle já
  -- existe e é salvo, mas ainda não dispara nada — o cron ignora por enquanto.
  status text not null default 'draft' check (status in ('draft', 'active')),
  graph jsonb not null default '{"nodes": [], "edges": []}'::jsonb,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index automation_flows_tenant_idx on public.automation_flows (tenant_id);

alter table public.automation_flows enable row level security;

-- Qualquer membro do tenant enxerga as trajetórias; só admin cria/edita/apaga
-- (mesmo padrão de lead_webhooks em 0046_automation_core).
create policy "automation_flows_select_own_tenant"
  on public.automation_flows for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "automation_flows_insert_own_admin"
  on public.automation_flows for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "automation_flows_update_own_admin"
  on public.automation_flows for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin())
  with check (tenant_id = public.current_tenant_id());

create policy "automation_flows_delete_own_admin"
  on public.automation_flows for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin());
