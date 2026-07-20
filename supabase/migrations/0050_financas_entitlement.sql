-- Produto "Finanças" — terceiro produto independente da plataforma, mesmo
-- padrão exato da Transportadora (0044): entitlement em tenant_products,
-- plano próprio, pode ser tenant novo do zero ou add-on de um tenant que já
-- tem CRM/Transportadora. Preço abaixo é placeholder — ajustar quando o
-- valor real for decidido (não afeta cobrança de verdade ainda, só o painel dev).
alter table public.tenant_products drop constraint tenant_products_product_check;
alter table public.tenant_products
  add constraint tenant_products_product_check check (product in ('transportadora', 'financas'));

-- plan_id apontava só pra transportadora_plans — com um segundo catálogo de
-- planos (financas_plans), não dá mais pra manter uma FK única (não é bem
-- polimórfico no Postgres sem trigger). Solta a FK; a integridade por
-- produto já é garantida pela aplicação (só grava o id do plano do próprio
-- produto sendo ativado).
alter table public.tenant_products drop constraint tenant_products_plan_id_fkey;

create table public.financas_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  monthly_price_cents int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index financas_plans_single_default_idx
  on public.financas_plans (is_default) where is_default;

alter table public.financas_plans enable row level security;

create policy "financas_plans_select_public"
  on public.financas_plans for select to anon, authenticated
  using (true);

create trigger set_updated_at
  before update on public.financas_plans
  for each row execute function public.set_updated_at();

insert into public.financas_plans (name, is_default, monthly_price_cents)
  values ('Finanças', true, 9990);

create or replace function public.current_tenant_has_financas()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_dev() or exists (
    select 1 from public.tenant_products
    where tenant_id = public.current_tenant_id()
      and product = 'financas'
      and status = 'active'
  );
$$;
