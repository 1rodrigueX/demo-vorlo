-- Checkout dos módulos add-on (Finanças, Estoque, Produção). Diferente da
-- Transportadora, esses são sempre add-ons de um tenant que já existe (o
-- usuário já tem conta/CRM), então tenant_id é obrigatório e não há
-- provisionamento de empresa nova. A concessão do acesso é um upsert em
-- public.tenant_products (product in ('financas','estoque','producao')), que
-- as funções current_tenant_has_* já leem.
--
-- Mesmo padrão de staging da transportadora_pending_checkouts: sem policy de
-- RLS (só o service role escreve/lê, via webhook e server actions admin).

create table public.module_pending_checkouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  module text not null check (module in ('financas', 'estoque', 'producao')),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  monthly_amount_cents integer not null,
  mp_preference_id text,
  created_at timestamptz not null default now()
);

-- Uma tentativa pendente por usuário+módulo (evita duplicar checkout).
create unique index module_pending_checkouts_one_pending
  on public.module_pending_checkouts (user_id, module) where status = 'pending';

create index module_pending_checkouts_user_idx on public.module_pending_checkouts (user_id);

alter table public.module_pending_checkouts enable row level security;
-- Sem policy — só o service role toca aqui (mesmo padrão de
-- transportadora_pending_checkouts / pending_checkouts).
