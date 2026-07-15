-- FALA AI.IA — multi-tenant: cada empresa cliente vira um "tenant" isolado
-- num banco único. Dev (você) fica fora do modelo de tenant, numa tabela própria.

-- ─────────────────────────────────────────────────────────────────────────
-- dev_users — acesso de plataforma, separado de qualquer tenant
-- ─────────────────────────────────────────────────────────────────────────
create table public.dev_users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.dev_users enable row level security;

create policy "dev_users_select_own"
  on public.dev_users for select to authenticated
  using (id = auth.uid());

create or replace function public.is_dev()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.dev_users where id = auth.uid());
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- tenants — uma linha por empresa cliente (CRM que você vende)
-- ─────────────────────────────────────────────────────────────────────────
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'suspended')),
  seller_limit int not null default 5,
  manager_limit int not null default 2,
  brand_color text not null default '#4f46e5',
  brand_font text not null default 'Geist Sans',
  assistant_button_position text not null default 'bottom-left'
    check (assistant_button_position in ('bottom-left', 'bottom-right')),
  created_at timestamptz not null default now()
);

alter table public.tenants enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- tenant_id nas tabelas existentes (precisa vir antes de current_tenant_id(),
-- que lê profiles.tenant_id)
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles add column tenant_id uuid references public.tenants (id);
alter table public.companies add column tenant_id uuid references public.tenants (id);
alter table public.contacts add column tenant_id uuid references public.tenants (id);
alter table public.pipeline_stages add column tenant_id uuid references public.tenants (id);
alter table public.deals add column tenant_id uuid references public.tenants (id);
alter table public.whatsapp_messages add column tenant_id uuid references public.tenants (id);
alter table public.activities add column tenant_id uuid references public.tenants (id);
alter table public.chat_messages add column tenant_id uuid references public.tenants (id);

-- current_tenant_id() é SECURITY DEFINER (mesmo padrão de is_admin() na migration
-- 0003) para poder ler o tenant_id do próprio usuário sem recursão de RLS.
create or replace function public.current_tenant_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select tenant_id from public.profiles where id = auth.uid();
$$;

create policy "tenants_select_own"
  on public.tenants for select to authenticated
  using (id = public.current_tenant_id());

-- Criação/ativação/edição de tenants só acontece via server action com o
-- client de service role (painel dev) — por isso não há policy de insert/update
-- para o role "authenticated" aqui.

-- ─────────────────────────────────────────────────────────────────────────
-- Backfill: os dados atuais viram o tenant #1 (FALA AI.IA), e o usuário
-- atual vira dono desse tenant + dev da plataforma.
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  v_tenant_id uuid;
begin
  insert into public.tenants (name, slug)
  values ('FALA AI.IA', 'fala-ai-ia')
  returning id into v_tenant_id;

  update public.profiles set tenant_id = v_tenant_id;
  update public.companies set tenant_id = v_tenant_id;
  update public.contacts set tenant_id = v_tenant_id;
  update public.pipeline_stages set tenant_id = v_tenant_id;
  update public.deals set tenant_id = v_tenant_id;
  update public.whatsapp_messages set tenant_id = v_tenant_id;
  update public.activities set tenant_id = v_tenant_id;
  update public.chat_messages set tenant_id = v_tenant_id;

  insert into public.dev_users (id, full_name)
  select id, raw_user_meta_data ->> 'full_name'
  from auth.users
  where email = 'danilloa035@gmail.com';
end $$;

alter table public.profiles alter column tenant_id set not null;
alter table public.companies alter column tenant_id set not null;
alter table public.contacts alter column tenant_id set not null;
alter table public.pipeline_stages alter column tenant_id set not null;
alter table public.deals alter column tenant_id set not null;
alter table public.whatsapp_messages alter column tenant_id set not null;
alter table public.activities alter column tenant_id set not null;
alter table public.chat_messages alter column tenant_id set not null;

create index profiles_tenant_id_idx on public.profiles (tenant_id);
create index companies_tenant_id_idx on public.companies (tenant_id);
create index contacts_tenant_id_idx on public.contacts (tenant_id);
create index pipeline_stages_tenant_id_idx on public.pipeline_stages (tenant_id);
create index deals_tenant_id_idx on public.deals (tenant_id);
create index whatsapp_messages_tenant_id_idx on public.whatsapp_messages (tenant_id);
create index activities_tenant_id_idx on public.activities (tenant_id);
create index chat_messages_tenant_id_idx on public.chat_messages (tenant_id);

-- ─────────────────────────────────────────────────────────────────────────
-- role: 'admin' passa a se chamar 'owner' (dono do CRM) + novo papel 'manager'
-- (gestor). is_admin() passa a significar "owner ou manager desse tenant" —
-- continua usada pelas policies existentes, agora também checando o tenant.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles drop constraint profiles_role_check;
update public.profiles set role = 'owner' where role = 'admin';
alter table public.profiles add constraint profiles_role_check
  check (role in ('owner', 'manager', 'member'));

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'manager')
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Reescreve todas as policies pra incluir isolamento por tenant_id
-- ─────────────────────────────────────────────────────────────────────────

-- profiles: só enxerga gente do próprio tenant (antes era "todo mundo vê todo mundo")
drop policy "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_own_tenant"
  on public.profiles for select to authenticated
  using (tenant_id = public.current_tenant_id());

-- companies
drop policy "companies_select_authenticated" on public.companies;
create policy "companies_select_own_tenant"
  on public.companies for select to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy "companies_insert_own" on public.companies;
create policy "companies_insert_own"
  on public.companies for insert to authenticated
  with check (created_by = auth.uid() and tenant_id = public.current_tenant_id());

drop policy "companies_update_own" on public.companies;
create policy "companies_update_own"
  on public.companies for update to authenticated
  using (tenant_id = public.current_tenant_id() and (created_by = auth.uid() or public.is_admin()));

drop policy "companies_delete_own" on public.companies;
create policy "companies_delete_own"
  on public.companies for delete to authenticated
  using (tenant_id = public.current_tenant_id() and (created_by = auth.uid() or public.is_admin()));

-- contacts
drop policy "contacts_select_own_or_admin" on public.contacts;
create policy "contacts_select_own_or_admin"
  on public.contacts for select to authenticated
  using (tenant_id = public.current_tenant_id() and (created_by = auth.uid() or public.is_admin()));

drop policy "contacts_insert_own" on public.contacts;
create policy "contacts_insert_own"
  on public.contacts for insert to authenticated
  with check (created_by = auth.uid() and tenant_id = public.current_tenant_id());

drop policy "contacts_update_own_or_admin" on public.contacts;
create policy "contacts_update_own_or_admin"
  on public.contacts for update to authenticated
  using (tenant_id = public.current_tenant_id() and (created_by = auth.uid() or public.is_admin()));

drop policy "contacts_delete_own_or_admin" on public.contacts;
create policy "contacts_delete_own_or_admin"
  on public.contacts for delete to authenticated
  using (tenant_id = public.current_tenant_id() and (created_by = auth.uid() or public.is_admin()));

-- pipeline_stages
drop policy "pipeline_stages_select_authenticated" on public.pipeline_stages;
create policy "pipeline_stages_select_own_tenant"
  on public.pipeline_stages for select to authenticated
  using (tenant_id = public.current_tenant_id());

-- deals
drop policy "deals_select_own_or_admin" on public.deals;
create policy "deals_select_own_or_admin"
  on public.deals for select to authenticated
  using (tenant_id = public.current_tenant_id() and (owner_id = auth.uid() or public.is_admin()));

drop policy "deals_insert_own" on public.deals;
create policy "deals_insert_own"
  on public.deals for insert to authenticated
  with check (owner_id = auth.uid() and tenant_id = public.current_tenant_id());

drop policy "deals_update_own_or_admin" on public.deals;
create policy "deals_update_own_or_admin"
  on public.deals for update to authenticated
  using (tenant_id = public.current_tenant_id() and (owner_id = auth.uid() or public.is_admin()));

drop policy "deals_delete_own_or_admin" on public.deals;
create policy "deals_delete_own_or_admin"
  on public.deals for delete to authenticated
  using (tenant_id = public.current_tenant_id() and (owner_id = auth.uid() or public.is_admin()));

-- whatsapp_messages
drop policy "whatsapp_messages_select_own_or_admin" on public.whatsapp_messages;
create policy "whatsapp_messages_select_own_or_admin"
  on public.whatsapp_messages for select to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (
      public.is_admin()
      or exists (
        select 1 from public.contacts c
        where c.id = whatsapp_messages.contact_id and c.created_by = auth.uid()
      )
    )
  );

drop policy "whatsapp_messages_insert_own" on public.whatsapp_messages;
create policy "whatsapp_messages_insert_own"
  on public.whatsapp_messages for insert to authenticated
  with check (sent_by = auth.uid() and tenant_id = public.current_tenant_id());

-- activities
drop policy "activities_select_own_or_admin" on public.activities;
create policy "activities_select_own_or_admin"
  on public.activities for select to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (
      public.is_admin()
      or exists (
        select 1 from public.contacts c
        where c.id = activities.contact_id and c.created_by = auth.uid()
      )
    )
  );

drop policy "activities_insert_authenticated" on public.activities;
create policy "activities_insert_authenticated"
  on public.activities for insert to authenticated
  with check (
    (created_by = auth.uid() or created_by is null)
    and tenant_id = public.current_tenant_id()
  );

drop policy "activities_update_own_or_admin" on public.activities;
create policy "activities_update_own_or_admin"
  on public.activities for update to authenticated
  using (tenant_id = public.current_tenant_id() and (created_by = auth.uid() or public.is_admin()));

drop policy "activities_delete_own_or_admin" on public.activities;
create policy "activities_delete_own_or_admin"
  on public.activities for delete to authenticated
  using (tenant_id = public.current_tenant_id() and (created_by = auth.uid() or public.is_admin()));

-- chat_messages: já era estritamente por usuário (mais restrito que por tenant),
-- então as policies continuam iguais — só ganhou a coluna tenant_id pra consistência
-- e uso futuro (ex: métricas do painel dev).

-- ─────────────────────────────────────────────────────────────────────────
-- handle_new_user(): agora exige tenant_id (e opcionalmente role) vindos do
-- user_metadata de quem criou a conta (painel dev cria dono; dono cria
-- vendedor/gestor) — não existe mais cadastro público auto-suficiente.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, tenant_id, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    (new.raw_user_meta_data ->> 'tenant_id')::uuid,
    coalesce(new.raw_user_meta_data ->> 'role', 'member')
  );
  return new;
end;
$$;
