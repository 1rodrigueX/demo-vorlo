-- RECUPERAÇÃO: 6 objetos que o código usa em produção mas que nunca chegaram
-- ao banco. Mesma classe de problema da 0083 (funnel_automation_settings) —
-- migrations aplicadas manualmente uma a uma desde a 0031, e algumas ficaram
-- pelo caminho sem ninguém perceber, porque a falha só aparece no momento em
-- que alguém usa a tela correspondente.
--
-- Descoberto quando um envio de WhatsApp falhou com
-- `column "channel" of relation "whatsapp_messages" does not exist`
-- (a mensagem chegou no cliente, mas não foi gravada no histórico).
-- Uma auditoria comparando cada migration com o schema real achou mais 5.
--
-- O que estava quebrado, e desde quando:
--   0048  bug_reports              -> aba "Reportar bug" + /dev/bugs
--   0060  profile_product_access   -> Configurações > Equipe (acesso a produtos)
--   0066  lead_channels            -> tela de detalhe do lead
--   0066  whatsapp_messages.channel-> gravar mensagem enviada no histórico
--   0067  lead_tasks               -> tarefas do lead + automações
--   0076  security_events/blocked_ips -> /dev/seguranca
--
-- Duas diferenças propositais em relação às migrations originais:
--
-- 1. FK de usuário aponta pra public.app_users(id), não auth.users(id) — as
--    originais são anteriores à migração pro Auth.js, e a 0081 já repontou
--    todas as outras pelo mesmo motivo (auth.users nunca mais recebe INSERT).
--
-- 2. NÃO reaplica as funções de entitlement que a 0060 redefinia
--    (current_tenant_has_transportadora/financas/estoque/producao). A 0078
--    as substituiu depois por versões com p_user_id, que são as que o app
--    chama hoje e funcionam. Reaplicar a versão da 0060 reintroduziria a
--    checagem por current_profile_has_product_access() e mudaria quem tem
--    acesso a quê — não é recuperação, é mudança de comportamento. Fica de
--    fora: o objetivo aqui é só destravar o que está quebrado.
--
-- Idempotente do começo ao fim (if not exists em tudo) — pode rodar de novo
-- sem efeito colateral.

-- ─────────────────────────────────────────────────────────────────────────
-- 0048 — bug_reports
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  created_by uuid references public.app_users (id) on delete set null,
  created_by_name text,
  message text not null,
  severity text not null default 'media' check (severity in ('baixa', 'media', 'alta', 'critica')),
  status text not null default 'new' check (status in ('new', 'answered')),
  response text,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists bug_reports_tenant_idx on public.bug_reports (tenant_id, created_at desc);
alter table public.bug_reports enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- 0060 — profile_product_access (só a tabela + backfill, ver nota 2 acima)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.profile_product_access (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  product text not null check (product in ('transportadora', 'financas', 'estoque', 'producao')),
  granted_at timestamptz not null default now(),
  primary key (profile_id, product)
);
alter table public.profile_product_access enable row level security;

-- Backfill original: ninguém perde acesso ao que o tenant dele já tem ativo.
insert into public.profile_product_access (profile_id, product)
select p.id, tp.product
from public.profiles p
join public.tenant_products tp on tp.tenant_id = p.tenant_id and tp.status = 'active'
where tp.product in ('transportadora', 'financas', 'estoque', 'producao')
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- 0066 — lead_channels + whatsapp_messages.channel (a causa do erro)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.lead_channels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  channel text not null check (channel in (
    'whatsapp', 'instagram', 'facebook', 'telegram', 'messenger', 'email', 'sms'
  )),
  external_id text,
  username text,
  phone text,
  avatar text,
  connected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contact_id, channel)
);
create index if not exists lead_channels_contact_idx on public.lead_channels (contact_id);
create index if not exists lead_channels_tenant_idx on public.lead_channels (tenant_id);
alter table public.lead_channels enable row level security;

-- O default já classifica todo o histórico como WhatsApp (é tudo que existe hoje).
alter table public.whatsapp_messages
  add column if not exists channel text not null default 'whatsapp';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'whatsapp_messages_channel_check'
  ) then
    alter table public.whatsapp_messages
      add constraint whatsapp_messages_channel_check
      check (channel in ('whatsapp', 'instagram', 'facebook', 'telegram', 'messenger', 'email', 'sms'));
  end if;
end $$;

-- Backfill: todo contato com telefone ganha o canal WhatsApp já conectado.
insert into public.lead_channels (tenant_id, contact_id, channel, phone, connected)
select tenant_id, id, 'whatsapp', phone, true
from public.contacts
where phone is not null and tenant_id is not null
on conflict (contact_id, channel) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- 0067 — lead_tasks
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.lead_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  title text not null,
  due_at timestamptz,
  done boolean not null default false,
  created_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lead_tasks_contact_idx on public.lead_tasks (contact_id);
create index if not exists lead_tasks_tenant_idx on public.lead_tasks (tenant_id);
alter table public.lead_tasks enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- 0076 — security_events + blocked_ips
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete set null,
  user_id uuid references public.app_users (id) on delete set null,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info', 'warn', 'critical')),
  ip text,
  user_agent text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists security_events_recent_idx on public.security_events (created_at desc);
create index if not exists security_events_severity_idx on public.security_events (severity, created_at desc)
  where severity in ('warn', 'critical');
create index if not exists security_events_ip_idx on public.security_events (ip, created_at desc) where ip is not null;
alter table public.security_events enable row level security;

create table if not exists public.blocked_ips (
  ip text primary key,
  reason text not null,
  severity text not null default 'warn' check (severity in ('warn', 'critical')),
  source text not null default 'auto' check (source in ('auto', 'manual')),
  hits int not null default 1,
  blocked_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists blocked_ips_active_idx on public.blocked_ips (expires_at);
alter table public.blocked_ips enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- Policies — is_dev()/current_tenant_id() puros são ambíguos desde a 0078
-- (ganharam overload com p_user_id, sem dropar o original), então todas
-- chamam com null::uuid explícito. RLS segue dormente (o shim roda como
-- service role, ver src/lib/supabase/server.ts) — escritas idempotentes
-- pra não falhar se a policy já existir.
-- ─────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_policies where tablename='bug_reports' and policyname='bug_reports_select_own_tenant') then
    create policy "bug_reports_select_own_tenant" on public.bug_reports for select to authenticated
      using (tenant_id = public.current_tenant_id(null::uuid));
  end if;

  if not exists (select 1 from pg_policies where tablename='lead_channels' and policyname='lead_channels_select_via_contact') then
    create policy "lead_channels_select_via_contact" on public.lead_channels for select to authenticated
      using (exists (select 1 from public.contacts c where c.id = lead_channels.contact_id
                       and c.tenant_id = public.current_tenant_id(null::uuid)));
  end if;

  if not exists (select 1 from pg_policies where tablename='lead_tasks' and policyname='lead_tasks_select_via_contact') then
    create policy "lead_tasks_select_via_contact" on public.lead_tasks for select to authenticated
      using (exists (select 1 from public.contacts c where c.id = lead_tasks.contact_id
                       and c.tenant_id = public.current_tenant_id(null::uuid)));
  end if;

  if not exists (select 1 from pg_policies where tablename='security_events' and policyname='security_events_select_dev') then
    create policy "security_events_select_dev" on public.security_events for select to authenticated
      using (public.is_dev(null::uuid));
  end if;

  if not exists (select 1 from pg_policies where tablename='blocked_ips' and policyname='blocked_ips_select_dev') then
    create policy "blocked_ips_select_dev" on public.blocked_ips for select to authenticated
      using (public.is_dev(null::uuid));
  end if;
end $$;
