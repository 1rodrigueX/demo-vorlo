-- Logs de uso por agente (mensagens, tokens, latência) — base pro futuro
-- dashboard de consumo/custo (Fase 6). Qualquer membro do tenant gera logs
-- ao conversar; só admin visualiza (mesmo padrão de tenant_integrations).
create table public.ai_agent_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  agent_id uuid not null references public.ai_agents (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  event_type text not null check (event_type in ('message', 'tool_call', 'error')),
  detail jsonb not null default '{}'::jsonb,
  model text,
  tokens_input int not null default 0,
  tokens_output int not null default 0,
  latency_ms int,
  created_at timestamptz not null default now()
);

create index ai_agent_logs_tenant_agent_created_idx
  on public.ai_agent_logs (tenant_id, agent_id, created_at desc);

alter table public.ai_agent_logs enable row level security;

create policy "ai_agent_logs_select_admin"
  on public.ai_agent_logs for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "ai_agent_logs_insert_own_tenant"
  on public.ai_agent_logs for insert to authenticated
  with check (tenant_id = public.current_tenant_id());
