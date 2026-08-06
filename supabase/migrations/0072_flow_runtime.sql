-- Trajetórias, Fase 2: execução. A 0069 criou o desenho e disse que "a
-- execução vem na Fase 2 reusando a fila automation_jobs + o cron
-- run-automations" — é isto aqui. Nenhuma infra nova: cada passo de cada
-- trajetória vira um job na mesma fila.
--
-- A peça central é o snapshot do grafo em flow_runs. Sem ele, o dono editar
-- uma trajetória enquanto ela roda faria a execução em andamento pular pra um
-- nó que não existe mais, ou executar um passo que o lead não deveria receber.
-- Com snapshot, quem já está no meio termina com as regras que valiam quando
-- entrou; quem entrar depois pega a versão nova.

-- ─────────────────────────────────────────────────────────────────────────
-- 1) Descadastro (opt-out)
--    Pré-requisito de qualquer envio automático — e do disparo em massa que
--    vem depois. Guardado no contato porque vale pra todos os canais, não só
--    pra uma campanha específica.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.contacts
  add column opted_out_at timestamptz,
  add column opted_out_reason text;

create index contacts_opted_out_idx on public.contacts (tenant_id) where opted_out_at is not null;

-- ─────────────────────────────────────────────────────────────────────────
-- 2) Execuções
-- ─────────────────────────────────────────────────────────────────────────
create table public.flow_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  flow_id uuid not null references public.automation_flows (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete set null,
  -- Cópia do grafo no momento em que o lead entrou (ver cabeçalho).
  graph_snapshot jsonb not null,
  current_node_id text,
  status text not null default 'running'
    check (status in ('running', 'waiting', 'done', 'failed', 'canceled')),
  -- Trava contra laço: um grafo com ciclo (A→B→A) mandaria mensagem pra
  -- sempre. Ver MAX_STEPS em automations/runtime.ts.
  steps_taken int not null default 0,
  context jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);

create index flow_runs_flow_idx on public.flow_runs (flow_id, status);
create index flow_runs_tenant_idx on public.flow_runs (tenant_id, started_at desc);
create index flow_runs_contact_idx on public.flow_runs (contact_id, started_at desc);

-- O mesmo lead não entra duas vezes na mesma trajetória enquanto a primeira
-- não terminar. Sem isso, um lead que manda 5 mensagens seguidas dispara 5
-- execuções da trajetória de "mensagem recebida" e recebe 5 respostas.
create unique index flow_runs_active_uidx
  on public.flow_runs (flow_id, contact_id)
  where status in ('running', 'waiting');

alter table public.flow_runs enable row level security;

-- Leitura pra qualquer membro do tenant (mesmo critério de automation_flows,
-- que qualquer um enxerga). Escrita é só do cron, via service role.
create policy "flow_runs_select_own_tenant"
  on public.flow_runs for select to authenticated
  using (tenant_id = public.current_tenant_id());

-- ─────────────────────────────────────────────────────────────────────────
-- 3) Passos executados — é o "por que esse lead recebeu isso?" quando o dono
--    perguntar. Sem essa trilha, depurar uma trajetória é adivinhação.
-- ─────────────────────────────────────────────────────────────────────────
create table public.flow_run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.flow_runs (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  node_id text not null,
  kind text not null,
  status text not null check (status in ('done', 'skipped', 'failed')),
  detail text,
  created_at timestamptz not null default now()
);

create index flow_run_steps_run_idx on public.flow_run_steps (run_id, created_at);

alter table public.flow_run_steps enable row level security;

create policy "flow_run_steps_select_own_tenant"
  on public.flow_run_steps for select to authenticated
  using (tenant_id = public.current_tenant_id());

-- ─────────────────────────────────────────────────────────────────────────
-- 4) Novo tipo de job na fila
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
    'flow_step'   -- um nó de uma trajetória
  ));
