-- Disparos em massa configurados pelo dono do CRM.
--
-- O risco aqui não é técnico, é comercial: disparo mal feito no WhatsApp
-- **bana o número do cliente**, e junto vai o histórico inteiro de conversa
-- dele. Por isso a tabela carrega ritmo, janela de horário e teto diário como
-- dado — não como boa intenção no código — e o motor (campaigns/runtime.ts)
-- respeita os três, mais o descadastro de 0072_flow_runtime.
--
-- A audiência é materializada em campaign_recipients no momento do
-- agendamento. Se fosse resolvida a cada rodada, um lead que entrasse no meio
-- do disparo receberia (ou deixaria de receber) por acidente, e não haveria
-- como responder "quem já recebeu?".

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp')),
  -- Filtros escolhidos na tela: { stageIds, tagIds, ownerIds, onlyWithPhone }
  audience jsonb not null default '{}'::jsonb,
  message text not null,
  -- Variações do texto. Mil mensagens byte-a-byte idênticas é assinatura de
  -- spam; o motor sorteia uma por envio.
  variants jsonb not null default '[]'::jsonb,
  -- { startAt }
  schedule jsonb not null default '{}'::jsonb,
  -- { batchSize, dailyCap } — o motor ainda aplica o aquecimento por cima.
  throttle jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'running', 'paused', 'done', 'canceled')),
  error text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index campaigns_tenant_idx on public.campaigns (tenant_id, created_at desc);

alter table public.campaigns enable row level security;

-- Só dono/gerente: é a funcionalidade que fala com a base inteira de clientes.
create policy "campaigns_select_own_admin"
  on public.campaigns for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "campaigns_insert_own_admin"
  on public.campaigns for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "campaigns_update_own_admin"
  on public.campaigns for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin())
  with check (tenant_id = public.current_tenant_id());

create policy "campaigns_delete_own_admin"
  on public.campaigns for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- Destinatários — o snapshot da audiência e o registro de quem já recebeu.
-- ─────────────────────────────────────────────────────────────────────────
create table public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'skipped', 'opted_out')),
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  -- A mesma pessoa não recebe a mesma campanha duas vezes, aconteça o que
  -- acontecer com a fila.
  unique (campaign_id, contact_id)
);

create index campaign_recipients_pending_idx
  on public.campaign_recipients (campaign_id, status)
  where status = 'pending';

create index campaign_recipients_tenant_sent_idx
  on public.campaign_recipients (tenant_id, sent_at)
  where sent_at is not null;

alter table public.campaign_recipients enable row level security;

-- Leitura pra admin acompanhar; escrita é do cron (service role).
create policy "campaign_recipients_select_own_admin"
  on public.campaign_recipients for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- Novo tipo de job na fila
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
    'kommo_import_page',
    'flow_step',
    'campaign_tick'   -- uma leva de envios de uma campanha
  ));
