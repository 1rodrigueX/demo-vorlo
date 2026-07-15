-- Histórico de conversa por agente (generaliza chat_messages, que era um
-- único histórico contínuo por vendedor sem noção de "qual agente").
create table public.ai_agent_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  agent_id uuid not null references public.ai_agents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index ai_agent_messages_agent_user_idx
  on public.ai_agent_messages (agent_id, user_id, created_at);

alter table public.ai_agent_messages enable row level security;

-- Privacidade estrita igual ao chat_messages original: só o dono da
-- conversa vê (nem admin do tenant lê o conteúdo de outro vendedor).
create policy "ai_agent_messages_select_own"
  on public.ai_agent_messages for select to authenticated
  using (user_id = auth.uid());

create policy "ai_agent_messages_insert_own"
  on public.ai_agent_messages for insert to authenticated
  with check (user_id = auth.uid() and tenant_id = public.current_tenant_id());

create policy "ai_agent_messages_delete_own"
  on public.ai_agent_messages for delete to authenticated
  using (user_id = auth.uid());

-- Memória de longo prazo do agente: fatos que ele mesmo registra (via tool
-- remember_fact) e que são reinjetados no system prompt nas próximas
-- conversas — compartilhada entre toda a equipe do tenant (não é por
-- vendedor, é do agente).
create table public.ai_agent_memory (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  agent_id uuid not null references public.ai_agents (id) on delete cascade,
  label text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_agent_memory_agent_idx on public.ai_agent_memory (agent_id, updated_at desc);

alter table public.ai_agent_memory enable row level security;

create policy "ai_agent_memory_select_own_tenant"
  on public.ai_agent_memory for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "ai_agent_memory_insert_own_tenant"
  on public.ai_agent_memory for insert to authenticated
  with check (tenant_id = public.current_tenant_id());

create policy "ai_agent_memory_update_own_tenant"
  on public.ai_agent_memory for update to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "ai_agent_memory_delete_admin"
  on public.ai_agent_memory for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin());

create trigger set_updated_at
  before update on public.ai_agent_memory
  for each row execute function public.set_updated_at();

-- Migra o histórico existente do assistente único pro FALA AI de cada
-- tenant, preservando o que o botão flutuante já mostrava.
insert into public.ai_agent_messages (tenant_id, agent_id, user_id, role, content, created_at)
select cm.tenant_id, a.id, cm.user_id, cm.role, cm.content, cm.created_at
from public.chat_messages cm
join public.ai_agents a on a.tenant_id = cm.tenant_id and a.is_fala_ai;
