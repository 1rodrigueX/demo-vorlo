-- Módulo de integrações genérico (FALA AI): cada tenant conecta suas próprias
-- credenciais para provedores novos (a começar pela chave da Anthropic, usada
-- pelos agentes de IA). Bling e WhatsApp continuam com suas tabelas próprias
-- (bling_connections/whatsapp_connections) — não fazem parte disto.
create table public.tenant_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  provider text not null check (
    provider in ('anthropic', 'gmail', 'outlook', 'google_calendar', 'microsoft365', 'custom')
  ),
  name text not null default '',
  status text not null default 'disconnected' check (status in ('disconnected', 'connected', 'error')),
  credentials jsonb not null default '{}'::jsonb,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  connected_at timestamptz,
  last_tested_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Só uma conexão por provedor "fixo" (anthropic, gmail...); 'custom' permite
-- várias linhas por tenant, diferenciadas por name.
create unique index tenant_integrations_unique_provider_idx
  on public.tenant_integrations (tenant_id, provider)
  where provider <> 'custom';

create index tenant_integrations_tenant_idx on public.tenant_integrations (tenant_id);

alter table public.tenant_integrations enable row level security;

-- Mais restrito que o precedente do Bling/WhatsApp (select liberado a
-- qualquer membro): aqui select/insert/update/delete exigem admin, porque
-- guarda credenciais mais sensíveis (ex: chave Anthropic da conta do tenant).
create policy "tenant_integrations_select_admin"
  on public.tenant_integrations for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "tenant_integrations_insert_admin"
  on public.tenant_integrations for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "tenant_integrations_update_admin"
  on public.tenant_integrations for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin())
  with check (tenant_id = public.current_tenant_id());

create policy "tenant_integrations_delete_admin"
  on public.tenant_integrations for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin());

create trigger set_updated_at
  before update on public.tenant_integrations
  for each row execute function public.set_updated_at();

-- Logs de eventos por integração (conectado, teste ok/falhou, token
-- renovado, erro) — alimenta a tela de integrações e futura auditoria.
create table public.tenant_integration_logs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.tenant_integrations (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  event text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index tenant_integration_logs_integration_idx
  on public.tenant_integration_logs (integration_id, created_at desc);

alter table public.tenant_integration_logs enable row level security;

create policy "tenant_integration_logs_select_admin"
  on public.tenant_integration_logs for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "tenant_integration_logs_insert_admin"
  on public.tenant_integration_logs for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.is_admin());
