-- Auth.js (v5) — base de identidade própria, no lugar do Supabase Auth (GoTrue).
--
-- "Começar limpo": tabelas próprias (app_*), mas SEMEADAS a partir de auth.users
-- preservando os MESMOS UUIDs — assim profiles.id, created_by, tenant owner e
-- todos os FKs que apontam pra auth.users(id) continuam válidos.
--
-- Aditivo e não-destrutivo: NÃO mexe em auth.*, que fica dormente e pode ser
-- removido depois. Seguro rodar com a app no ar (ela ainda não usa estas tabelas).

create extension if not exists pgcrypto;

-- ── Usuários ────────────────────────────────────────────────────────────────
create table if not exists public.app_users (
  id                uuid primary key,
  email             text not null,
  email_verified_at timestamptz,
  password_hash     text,
  full_name         text,
  image             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index if not exists app_users_email_key on public.app_users (lower(email));

-- ── Contas OAuth (Google) vinculadas a um usuário ───────────────────────────
create table if not exists public.app_oauth_accounts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.app_users(id) on delete cascade,
  provider            text not null,
  provider_account_id text not null,
  created_at          timestamptz not null default now(),
  unique (provider, provider_account_id)
);
create index if not exists app_oauth_user_idx on public.app_oauth_accounts(user_id);

-- ── Fatores MFA (TOTP) ──────────────────────────────────────────────────────
create table if not exists public.app_mfa_factors (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.app_users(id) on delete cascade,
  type          text not null default 'totp',
  secret        text not null,
  friendly_name text,
  verified_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists app_mfa_user_idx on public.app_mfa_factors(user_id);

-- ── Tokens de e-mail (confirmação de cadastro e reset de senha) ──────────────
-- Guarda só o HASH do token; o valor cru vai no link por e-mail.
create table if not exists public.app_auth_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.app_users(id) on delete cascade,
  email      text,
  purpose    text not null,               -- 'email_verify' | 'password_reset'
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists app_auth_tokens_purpose_idx on public.app_auth_tokens(purpose);

-- ── Segurança: nada de PostgREST/anon nessas tabelas (guardam hash de senha e
-- segredo TOTP). RLS ligada sem policy = deny-all; a app conecta como role que
-- dá bypass de RLS (mesmo caminho do shim de dados). ──────────────────────────
alter table public.app_users          enable row level security;
alter table public.app_oauth_accounts enable row level security;
alter table public.app_mfa_factors    enable row level security;
alter table public.app_auth_tokens    enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on public.app_users, public.app_oauth_accounts, public.app_mfa_factors, public.app_auth_tokens from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on public.app_users, public.app_oauth_accounts, public.app_mfa_factors, public.app_auth_tokens from authenticated';
  end if;
end $$;

-- ── Seed a partir do Supabase Auth (idempotente) ────────────────────────────
insert into public.app_users (id, email, email_verified_at, password_hash, full_name, image, created_at)
select u.id,
       u.email,
       u.email_confirmed_at,
       u.encrypted_password,
       coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
       u.raw_user_meta_data->>'avatar_url',
       u.created_at
from auth.users u
where u.email is not null
on conflict (id) do nothing;

insert into public.app_oauth_accounts (user_id, provider, provider_account_id)
select i.user_id, i.provider, i.provider_id
from auth.identities i
where i.provider <> 'email'
on conflict (provider, provider_account_id) do nothing;

insert into public.app_mfa_factors (user_id, type, secret, friendly_name, verified_at)
select f.user_id, f.factor_type, f.secret, nullif(f.friendly_name, ''), coalesce(f.updated_at, f.created_at)
from auth.mfa_factors f
where f.status = 'verified' and f.secret is not null and f.factor_type = 'totp'
on conflict do nothing;
