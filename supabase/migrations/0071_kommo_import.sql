-- Importação do Kommo (ex-amoCRM): o cliente cola o subdomínio e um token de
-- acesso de longa duração e o CRM puxa funis, usuários, campos personalizados,
-- empresas, contatos e leads.
--
-- Nada roda dentro do request HTTP: uma conta com alguns milhares de leads
-- estoura qualquer timeout. A importação vira uma linha em `kommo_imports` com
-- um cursor, e cada página é um job na fila que já existe (automation_jobs +
-- cron run-automations, ver 0046). Isso dá retomada, progresso e cancelamento
-- de graça — e se a VPS reiniciar no meio, continua de onde parou.
--
-- A idempotência mora em `kommo_entity_map`: rodar a importação de novo
-- ATUALIZA o que já veio, não duplica. Junto com o índice único de
-- contacts.phone_key (0070_contact_dedupe), reimportar é seguro.

-- ─────────────────────────────────────────────────────────────────────────
-- 1) Conexão — reusa tenant_integrations (RLS admin-only, logs e criptografia
--    já prontos). credentials guarda { subdomain }, o token vai em
--    access_token passando por encryptSecret().
-- ─────────────────────────────────────────────────────────────────────────
alter table public.tenant_integrations
  drop constraint if exists tenant_integrations_provider_check;

alter table public.tenant_integrations
  add constraint tenant_integrations_provider_check
  check (
    provider in ('anthropic', 'gmail', 'outlook', 'google_calendar', 'microsoft365', 'kommo', 'custom')
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 2) Campos personalizados
--    O CRM não tinha esse conceito. Os valores ficam num jsonb na própria
--    linha (sem join em toda listagem, que é o que pesa numa tela de lista) e
--    as definições numa tabela à parte, que é o que o formulário e os filtros
--    precisam pra saber rótulo, tipo e opções.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.contacts add column custom_fields jsonb not null default '{}'::jsonb;
alter table public.deals add column custom_fields jsonb not null default '{}'::jsonb;

create index contacts_custom_fields_idx on public.contacts using gin (custom_fields);
create index deals_custom_fields_idx on public.deals using gin (custom_fields);

create table public.custom_field_defs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  entity text not null check (entity in ('contact', 'deal', 'company')),
  -- Chave dentro do jsonb custom_fields. Pra campo vindo do Kommo é
  -- "kommo_<id>", que sobrevive a renomear o campo lá.
  key text not null,
  name text not null,
  field_type text not null default 'text' check (
    field_type in ('text', 'textarea', 'number', 'date', 'select', 'multiselect', 'checkbox', 'url', 'phone', 'email')
  ),
  options jsonb not null default '[]'::jsonb,
  source text not null default 'manual' check (source in ('manual', 'kommo')),
  external_id text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (tenant_id, entity, key)
);

create index custom_field_defs_tenant_idx on public.custom_field_defs (tenant_id, entity, position);

alter table public.custom_field_defs enable row level security;

-- Qualquer membro precisa ler (o formulário de contato renderiza os campos);
-- só admin cria/edita, mesmo padrão de lead_webhooks.
create policy "custom_field_defs_select_own_tenant"
  on public.custom_field_defs for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "custom_field_defs_insert_own_admin"
  on public.custom_field_defs for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "custom_field_defs_update_own_admin"
  on public.custom_field_defs for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin())
  with check (tenant_id = public.current_tenant_id());

create policy "custom_field_defs_delete_own_admin"
  on public.custom_field_defs for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- 3) A importação em si
-- ─────────────────────────────────────────────────────────────────────────
create table public.kommo_imports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'done', 'failed', 'canceled')),
  -- O que importar + para onde. Decisão do cliente, não nossa:
  -- { entities: [...], stageMap: { "<status_id kommo>": "<pipeline_stage id>" },
  --   ownerMap: { "<user id kommo>": "<profile id>" }, defaultOwnerId, defaultStageId }
  scope jsonb not null default '{}'::jsonb,
  -- De onde continuar: { entity: 'leads', page: 7 }
  cursor jsonb not null default '{}'::jsonb,
  -- { contactsCreated, contactsUpdated, dealsCreated, ..., skippedNoPhone }
  stats jsonb not null default '{}'::jsonb,
  error text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index kommo_imports_tenant_idx on public.kommo_imports (tenant_id, created_at desc);

alter table public.kommo_imports enable row level security;

-- Só admin: a importação mexe no CRM inteiro. Quem escreve durante a execução
-- é o cron (service role, bypassa RLS).
create policy "kommo_imports_select_own_admin"
  on public.kommo_imports for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "kommo_imports_insert_own_admin"
  on public.kommo_imports for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "kommo_imports_update_own_admin"
  on public.kommo_imports for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin())
  with check (tenant_id = public.current_tenant_id());

-- ─────────────────────────────────────────────────────────────────────────
-- 4) Mapa Kommo -> CRM. É o que torna a reimportação idempotente, e o que
--    permite ligar um lead ao contato dele (o Kommo referencia por id).
-- ─────────────────────────────────────────────────────────────────────────
create table public.kommo_entity_map (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  entity text not null check (
    entity in ('lead', 'contact', 'company', 'user', 'pipeline', 'status', 'custom_field')
  ),
  kommo_id text not null,
  local_id uuid not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, entity, kommo_id)
);

create index kommo_entity_map_local_idx on public.kommo_entity_map (tenant_id, entity, local_id);

alter table public.kommo_entity_map enable row level security;

-- Sem policy de escrita: só o cron (service role) alimenta. Admin lê pra
-- conferir o que já veio.
create policy "kommo_entity_map_select_own_admin"
  on public.kommo_entity_map for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- 5) Novo tipo de job na fila (o CHECK anterior é de 0064_funnel_automation)
-- ─────────────────────────────────────────────────────────────────────────
alter table public.automation_jobs
  drop constraint if exists automation_jobs_job_type_check;

alter table public.automation_jobs
  add constraint automation_jobs_job_type_check
  check (job_type in (
    'lead_webhook_welcome',
    'proposal_followup',
    'inactive_check',
    'deal_won_message',
    'kommo_import_page'   -- uma página de uma entidade do Kommo
  ));
