-- Base do motor de automação do CRM (fila de jobs genérica + captura de lead
-- por webhook público). Primeira peça de um conjunto maior de automações
-- (follow-up de lead inativo, disparo em massa, lead scoring, etc.) que vão
-- reusar essa mesma fila — começando pelo caso mais simples e de menor risco:
-- landing page / formulário externo → contato no CRM.
--
-- Fila em Postgres, não Redis/BullMQ: a VPS já roda um único processo PM2 (o
-- Baileys já depende disso hoje, ver baileysClient.ts), então um worker
-- separado seria infra nova sem necessidade agora. `automation_jobs` é
-- processada por um cron HTTP (mesmo padrão de billing-cycle: segredo
-- compartilhado, chamado pelo crontab da VPS), só que a cada poucos minutos
-- em vez de 1x/dia.
create table public.automation_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  job_type text not null check (job_type in ('lead_webhook_welcome')),
  run_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  attempts int not null default 0,
  payload jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index automation_jobs_due_idx on public.automation_jobs (status, run_at);

alter table public.automation_jobs enable row level security;
-- Sem policy — só o service role (cron) toca aqui, mesmo padrão de
-- transportadora_pending_checkouts.

-- ─────────────────────────────────────────────────────────────────────────
-- lead_webhooks — um endpoint público por linha, token no lugar de sessão
-- (quem chama é o servidor da landing page/formulário, não um usuário
-- logado). Cada webhook já sabe em qual coluna do funil o lead cai e,
-- opcionalmente, dispara uma mensagem de boas-vindas automática no WhatsApp
-- (via automation_jobs) se o lead informar telefone.
-- ─────────────────────────────────────────────────────────────────────────
create table public.lead_webhooks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  target_stage_id uuid references public.pipeline_stages (id) on delete set null,
  welcome_message text,
  is_active boolean not null default true,
  leads_received int not null default 0,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index lead_webhooks_tenant_idx on public.lead_webhooks (tenant_id);

alter table public.lead_webhooks enable row level security;

create policy "lead_webhooks_select_own"
  on public.lead_webhooks for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "lead_webhooks_insert_own_admin"
  on public.lead_webhooks for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "lead_webhooks_update_own_admin"
  on public.lead_webhooks for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin())
  with check (tenant_id = public.current_tenant_id());

create policy "lead_webhooks_delete_own_admin"
  on public.lead_webhooks for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin());
