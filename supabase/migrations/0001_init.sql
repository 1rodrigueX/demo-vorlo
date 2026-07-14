-- CRM Nyplastic — schema inicial
-- Rodar no SQL Editor do Supabase (ou via `supabase db push`).

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- Cria a linha em profiles automaticamente quando um usuário se cadastra.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- companies
-- ─────────────────────────────────────────────────────────────────────────
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  notes text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies enable row level security;

create policy "companies_select_authenticated"
  on public.companies for select to authenticated using (true);
create policy "companies_insert_own"
  on public.companies for insert to authenticated with check (created_by = auth.uid());
create policy "companies_update_own"
  on public.companies for update to authenticated using (created_by = auth.uid());
create policy "companies_delete_own"
  on public.companies for delete to authenticated using (created_by = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- contacts
-- ─────────────────────────────────────────────────────────────────────────
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text, -- E.164, ex: +5511999999999
  lead_source text,
  company_id uuid references public.companies (id) on delete set null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_company_id_idx on public.contacts (company_id);

alter table public.contacts enable row level security;

create policy "contacts_select_authenticated"
  on public.contacts for select to authenticated using (true);
create policy "contacts_insert_own"
  on public.contacts for insert to authenticated with check (created_by = auth.uid());
create policy "contacts_update_own"
  on public.contacts for update to authenticated using (created_by = auth.uid());
create policy "contacts_delete_own"
  on public.contacts for delete to authenticated using (created_by = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- pipeline_stages
-- ─────────────────────────────────────────────────────────────────────────
create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position int not null,
  color text not null default '#6366f1',
  is_won boolean not null default false,
  is_lost boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.pipeline_stages enable row level security;

create policy "pipeline_stages_select_authenticated"
  on public.pipeline_stages for select to authenticated using (true);
-- Sem insert/update/delete por enquanto: estágios são gerenciados via migration/seed.

-- ─────────────────────────────────────────────────────────────────────────
-- deals
-- ─────────────────────────────────────────────────────────────────────────
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  stage_id uuid not null references public.pipeline_stages (id),
  value numeric(12, 2) not null default 0,
  status text not null default 'open' check (status in ('open', 'won', 'lost')),
  owner_id uuid not null references public.profiles (id),
  position int not null default 0,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deals_contact_id_idx on public.deals (contact_id);
create index deals_stage_id_idx on public.deals (stage_id);

alter table public.deals enable row level security;

create policy "deals_select_authenticated"
  on public.deals for select to authenticated using (true);
create policy "deals_insert_own"
  on public.deals for insert to authenticated with check (owner_id = auth.uid());
create policy "deals_update_own"
  on public.deals for update to authenticated using (owner_id = auth.uid());
create policy "deals_delete_own"
  on public.deals for delete to authenticated using (owner_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- whatsapp_messages
-- ─────────────────────────────────────────────────────────────────────────
create table public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  twilio_sid text unique,
  direction text not null check (direction in ('outbound', 'inbound')),
  from_number text not null,
  to_number text not null,
  body text,
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'sent', 'delivered', 'undelivered', 'read', 'failed', 'received')),
  error_message text,
  raw_payload jsonb,
  sent_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index whatsapp_messages_contact_id_idx on public.whatsapp_messages (contact_id, created_at desc);

alter table public.whatsapp_messages enable row level security;

create policy "whatsapp_messages_select_authenticated"
  on public.whatsapp_messages for select to authenticated using (true);
create policy "whatsapp_messages_insert_own"
  on public.whatsapp_messages for insert to authenticated with check (sent_by = auth.uid());
-- Nenhuma policy de update para 'authenticated': atualizações de status chegam
-- pelo webhook do Twilio usando a service role key (bypassa RLS).

-- ─────────────────────────────────────────────────────────────────────────
-- activities (timeline unificada)
-- ─────────────────────────────────────────────────────────────────────────
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete set null,
  type text not null check (type in ('note', 'call', 'whatsapp', 'follow_up', 'stage_change')),
  body text,
  direction text check (direction in ('outbound', 'inbound')),
  created_by uuid references public.profiles (id),
  whatsapp_message_id uuid references public.whatsapp_messages (id),
  created_at timestamptz not null default now()
);

create index activities_contact_id_idx on public.activities (contact_id, created_at desc);

alter table public.activities enable row level security;

create policy "activities_select_authenticated"
  on public.activities for select to authenticated using (true);
create policy "activities_insert_authenticated"
  on public.activities for insert to authenticated
  with check (created_by = auth.uid() or created_by is null);
create policy "activities_update_own"
  on public.activities for update to authenticated using (created_by = auth.uid());
create policy "activities_delete_own"
  on public.activities for delete to authenticated using (created_by = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- updated_at automático
-- ─────────────────────────────────────────────────────────────────────────
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.companies
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.deals
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.whatsapp_messages
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Realtime: habilita mudanças em activities e whatsapp_messages
-- ─────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.activities;
alter publication supabase_realtime add table public.whatsapp_messages;
