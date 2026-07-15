-- Base pra cobrança dinâmica (planos) + checkout público via Stripe: a
-- landing page (sem sessão) precisa ler o plano padrão pra montar o preço,
-- e o webhook do Stripe precisa vincular o tenant criado à assinatura.
create table public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  base_price_cents int not null,
  included_sellers int not null default 0,
  included_managers int not null default 0,
  included_agents int not null default 0,
  price_per_extra_seller_cents int not null default 0,
  price_per_extra_manager_cents int not null default 0,
  price_per_agent_cents int not null default 0,
  price_per_integration_cents int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index billing_plans_single_default_idx on public.billing_plans (is_default) where is_default;

alter table public.billing_plans enable row level security;

-- Preço é informação pública (aparece na landing page, sem sessão) — select
-- liberado pra qualquer um; mutação só via admin client (painel dev, Fase 5).
create policy "billing_plans_select_public"
  on public.billing_plans for select to anon, authenticated
  using (true);

create trigger set_updated_at
  before update on public.billing_plans
  for each row execute function public.set_updated_at();

insert into public.billing_plans (
  name, is_default, base_price_cents, included_sellers, included_managers, included_agents,
  price_per_extra_seller_cents, price_per_extra_manager_cents, price_per_agent_cents, price_per_integration_cents
) values (
  'Plano Padrão', true, 5000, 5, 2, 1, 500, 500, 1000, 3000
);

alter table public.tenants
  add column billing_plan_id uuid references public.billing_plans (id),
  add column stripe_customer_id text,
  add column stripe_subscription_id text;

-- Idempotência do webhook do Stripe: cada evento só é processado uma vez
-- (a própria PK previne reprocessar em reentregas). Sem policy nenhuma —
-- só o service role (webhook) toca aqui, nunca o app com sessão de usuário.
create table public.stripe_webhook_events (
  id text primary key,
  created_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
