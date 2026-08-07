-- Fundação do painel de cibersegurança em tempo real (visão do time Synexa).
--
-- Primeira peça de um sistema maior: aqui entram o registro de eventos de
-- segurança e a lista de IPs bloqueados. WebAuthn/passkey, criptografia por
-- tenant e bloqueio no middleware vêm depois, sobre a base já migrada pra
-- Prisma — esta parte é aditiva e não toca em autenticação, então entra antes.
--
-- Continua sendo migration do Supabase (como todas as outras) porque a
-- aplicação ainda roda nele enquanto a migração pro Prisma acontece; o
-- `prisma db pull` vai puxar estas tabelas junto quando chegar a hora.

-- ─────────────────────────────────────────────────────────────────────────
-- security_events — a trilha que alimenta o painel ao vivo. Um evento por
-- linha: login, tentativa barrada, entrada suspeita, acesso negado, etc.
--
-- tenant_id é NULLABLE de propósito: muita coisa de segurança acontece ANTES
-- de saber de qual empresa é (login que falhou, cron chamado com segredo
-- errado, varredura de endpoint público). Esses são eventos da plataforma.
-- ─────────────────────────────────────────────────────────────────────────
create table public.security_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info', 'warn', 'critical')),
  ip text,
  user_agent text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- O painel lê "os mais recentes primeiro" e filtra por gravidade — os dois
-- índices cobrem exatamente isso.
create index security_events_recent_idx on public.security_events (created_at desc);
create index security_events_severity_idx on public.security_events (severity, created_at desc)
  where severity in ('warn', 'critical');
create index security_events_ip_idx on public.security_events (ip, created_at desc) where ip is not null;

alter table public.security_events enable row level security;

-- Só o time Synexa lê. Quem escreve é o código do servidor via service role
-- (o logSecurityEvent roda de qualquer lugar, inclusive sem sessão), então
-- não há policy de escrita — o service role ignora RLS.
create policy "security_events_select_dev"
  on public.security_events for select to authenticated
  using (public.is_dev());

-- ─────────────────────────────────────────────────────────────────────────
-- blocked_ips — a defesa que efetivamente mantém o atacante do lado de fora.
-- expires_at nulo = bloqueio permanente; com data = bloqueio temporário, que
-- é o normal pra abuso automático (some sozinho quando a onda passa).
-- ─────────────────────────────────────────────────────────────────────────
create table public.blocked_ips (
  ip text primary key,
  reason text not null,
  severity text not null default 'warn' check (severity in ('warn', 'critical')),
  -- 'auto' = o próprio sistema bloqueou (força bruta, varredura);
  -- 'manual' = alguém do time bloqueou pelo painel.
  source text not null default 'auto' check (source in ('auto', 'manual')),
  hits int not null default 1,
  blocked_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index blocked_ips_active_idx on public.blocked_ips (expires_at);

alter table public.blocked_ips enable row level security;

-- Dev administra pelo painel (com sessão), então precisa das quatro operações.
-- A checagem em runtime (isIpBlocked) roda via service role e ignora isto.
create policy "blocked_ips_select_dev"
  on public.blocked_ips for select to authenticated
  using (public.is_dev());

create policy "blocked_ips_insert_dev"
  on public.blocked_ips for insert to authenticated
  with check (public.is_dev());

create policy "blocked_ips_update_dev"
  on public.blocked_ips for update to authenticated
  using (public.is_dev())
  with check (public.is_dev());

create policy "blocked_ips_delete_dev"
  on public.blocked_ips for delete to authenticated
  using (public.is_dev());
