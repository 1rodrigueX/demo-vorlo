-- Produto "Transportadora" (app Flutter em apps/frete-app): módulo vendido
-- separadamente do CRM, com assinatura e ciclo de cobrança próprios. Reusa
-- `tenants` como a "empresa" (mesma âncora do CRM), mas o direito de acesso
-- vive numa tabela paralela (tenant_products) — assim o CRM pode ficar
-- past_due/suspended sem afetar a Transportadora, e vice-versa.
--
-- Diferença importante em relação ao resto do schema: o app Flutter fala
-- direto com o Supabase (sem o Next.js como intermediário confiável), então
-- a checagem de assinatura ativa precisa estar dentro da própria RLS —
-- current_tenant_has_transportadora() é o que a migration 0045 usa nas
-- policies das tabelas de dados, não só uma checagem de tela no app.
--
-- is_dev() (migration 0005) já resolve "acesso vitalício pro dev": quem está
-- em dev_users passa direto, sem precisar de linha nenhuma em tenant_products.

create table public.transportadora_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  monthly_price_cents int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index transportadora_plans_single_default_idx
  on public.transportadora_plans (is_default) where is_default;

alter table public.transportadora_plans enable row level security;

-- Preço é informação pública (aparece na página de compra, sem sessão) —
-- mesmo padrão de billing_plans_select_public.
create policy "transportadora_plans_select_public"
  on public.transportadora_plans for select to anon, authenticated
  using (true);

create trigger set_updated_at
  before update on public.transportadora_plans
  for each row execute function public.set_updated_at();

insert into public.transportadora_plans (name, is_default, monthly_price_cents)
  values ('Transportadora', true, 7990);

-- ─────────────────────────────────────────────────────────────────────────
-- tenant_products — entitlement + ciclo de cobrança por produto, um dia
-- podendo ter mais linhas (product in (...)) se surgir um segundo add-on.
-- ─────────────────────────────────────────────────────────────────────────
create table public.tenant_products (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  product text not null check (product in ('transportadora')),
  status text not null default 'active' check (status in ('active', 'past_due', 'suspended')),
  plan_id uuid references public.transportadora_plans (id),
  mp_payer_id text,
  last_payment_id text,
  monthly_amount_cents int,
  next_billing_at timestamptz,
  pending_payment_url text,
  activated_at timestamptz not null default now(),
  primary key (tenant_id, product)
);

alter table public.tenant_products enable row level security;

create policy "tenant_products_select_own_tenant"
  on public.tenant_products for select to authenticated
  using (tenant_id = public.current_tenant_id());

-- Sem policy de insert/update pra "authenticated" — só o service role
-- (webhook/provisionamento) escreve aqui, mesmo padrão de `tenants`.

create or replace function public.current_tenant_has_transportadora()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_dev() or exists (
    select 1 from public.tenant_products
    where tenant_id = public.current_tenant_id()
      and product = 'transportadora'
      and status = 'active'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- transportadora_pending_checkouts — staging da compra, mesmo papel de
-- pending_checkouts. Tabela separada (não generaliza pending_checkouts) pra
-- não encostar num fluxo de cobrança do CRM que já está em produção.
--
-- tenant_id vem preenchido quando quem compra já é dono de um tenant (está
-- comprando a Transportadora como add-on); fica null quando é gente nova,
-- que nunca comprou o CRM (aí company_name é obrigatório pra criar o tenant
-- do zero no provisionamento).
-- ─────────────────────────────────────────────────────────────────────────
create table public.transportadora_pending_checkouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  tenant_id uuid references public.tenants (id),
  company_name text,
  plan_id uuid not null references public.transportadora_plans (id),
  mp_preference_id text,
  created_at timestamptz not null default now(),
  constraint transportadora_pending_checkouts_target_chk
    check (tenant_id is not null or company_name is not null)
);

create unique index transportadora_pending_checkouts_one_pending_per_user
  on public.transportadora_pending_checkouts (user_id) where status = 'pending';

alter table public.transportadora_pending_checkouts enable row level security;
-- Sem policy — só o service role toca aqui, mesmo padrão de pending_checkouts.

-- Reusa public.mercadopago_webhook_events (migration 0040) pra idempotência
-- do webhook — já é uma dedup genérica por id de pagamento do Mercado Pago,
-- não precisa de uma tabela nova só pra esse fluxo.
