-- Estoque deixa de depender do Controle de Finanças e vira produto próprio
-- (como CRM/Transportadora): plano, entitlement e RLS independentes. O
-- link "compra de estoque lança despesa em Empresarial" continua existindo,
-- mas passa a viver na aplicação (checa se o tenant também tem Finanças
-- ativo antes de lançar) em vez de a tabela exigir Finanças pra funcionar.

create table public.estoque_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  monthly_price_cents int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.estoque_plans (name, is_default, monthly_price_cents)
  values ('Estoque', true, 4990);

alter table public.tenant_products drop constraint tenant_products_product_check;
alter table public.tenant_products
  add constraint tenant_products_product_check
    check (product in ('transportadora', 'financas', 'estoque'));

create or replace function public.current_tenant_has_estoque()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_dev() or exists (
    select 1 from public.tenant_products
    where tenant_id = public.current_tenant_id()
      and product = 'estoque'
      and status = 'active'
  );
$$;

drop policy "estoque_itens_select_own_tenant" on public.estoque_itens;
drop policy "estoque_itens_insert_own_tenant" on public.estoque_itens;
drop policy "estoque_itens_update_own_tenant" on public.estoque_itens;
drop policy "estoque_itens_delete_own_tenant" on public.estoque_itens;

create policy "estoque_itens_select_own_tenant"
  on public.estoque_itens for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_estoque());
create policy "estoque_itens_insert_own_tenant"
  on public.estoque_itens for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_estoque());
create policy "estoque_itens_update_own_tenant"
  on public.estoque_itens for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_estoque())
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_estoque());
create policy "estoque_itens_delete_own_tenant"
  on public.estoque_itens for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_estoque());

drop policy "estoque_movimentacoes_select_own_tenant" on public.estoque_movimentacoes;
drop policy "estoque_movimentacoes_insert_own_tenant" on public.estoque_movimentacoes;

create policy "estoque_movimentacoes_select_own_tenant"
  on public.estoque_movimentacoes for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_estoque());
create policy "estoque_movimentacoes_insert_own_tenant"
  on public.estoque_movimentacoes for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_estoque());
