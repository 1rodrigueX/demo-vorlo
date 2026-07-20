-- Controle de acesso por usuário aos produtos adicionais (Transportadora,
-- Finanças, Estoque, Produção). CRM continua liberado pra qualquer membro
-- do tenant — sempre foi a base, sem checagem própria de entitlement, e
-- restringir isso exigiria retrofitar dezenas de policies de CRM (contacts,
-- deals, whatsapp, etc.), fora do escopo daqui.
--
-- Dono sempre tem acesso a tudo. Funcionário de Produção
-- (producao_funcionarios) passa direto pro que já é dele — essa tabela é
-- sobre profiles (owner/manager/member), não sobre o modelo isolado dele.

create table public.profile_product_access (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  product text not null check (product in ('transportadora', 'financas', 'estoque', 'producao')),
  granted_at timestamptz not null default now(),
  primary key (profile_id, product)
);

alter table public.profile_product_access enable row level security;

create policy "profile_product_access_select_own_tenant"
  on public.profile_product_access for select to authenticated
  using (profile_id in (select id from public.profiles where tenant_id = public.current_tenant_id()));

create policy "profile_product_access_insert_owner"
  on public.profile_product_access for insert to authenticated
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
    and profile_id in (select id from public.profiles where tenant_id = public.current_tenant_id())
  );

create policy "profile_product_access_delete_owner"
  on public.profile_product_access for delete to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
    and profile_id in (select id from public.profiles where tenant_id = public.current_tenant_id())
  );

create or replace function public.current_profile_has_product_access(p_product text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_dev()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
    or exists (select 1 from public.producao_funcionarios where id = auth.uid())
    or exists (
      select 1 from public.profile_product_access
      where profile_id = auth.uid() and product = p_product
    );
$$;

-- Backfill: ninguém que já usa um produto perde acesso na hora que essa
-- migration roda — todo profile existente ganha explicitamente o que o
-- tenant dele já tem ativo. Só usuários criados DEPOIS disso nascem sem
-- nada até o dono liberar.
insert into public.profile_product_access (profile_id, product)
select p.id, tp.product
from public.profiles p
join public.tenant_products tp on tp.tenant_id = p.tenant_id and tp.status = 'active'
where tp.product in ('transportadora', 'financas', 'estoque', 'producao')
on conflict do nothing;

create or replace function public.current_tenant_has_transportadora()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_dev() or (
    exists (
      select 1 from public.tenant_products
      where tenant_id = public.current_tenant_id() and product = 'transportadora' and status = 'active'
    )
    and public.current_profile_has_product_access('transportadora')
  );
$$;

create or replace function public.current_tenant_has_financas()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_dev() or (
    exists (
      select 1 from public.tenant_products
      where tenant_id = public.current_tenant_id() and product = 'financas' and status = 'active'
    )
    and public.current_profile_has_product_access('financas')
  );
$$;

create or replace function public.current_tenant_has_estoque()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_dev() or (
    exists (
      select 1 from public.tenant_products
      where tenant_id = public.current_tenant_id() and product = 'estoque' and status = 'active'
    )
    and public.current_profile_has_product_access('estoque')
  );
$$;

create or replace function public.current_tenant_has_producao()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_dev() or (
    exists (
      select 1 from public.tenant_products
      where tenant_id = public.current_tenant_id() and product = 'producao' and status = 'active'
    )
    and public.current_profile_has_product_access('producao')
  );
$$;

create or replace function public.current_tenant_has_producao_actor()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_dev() or (
    exists (
      select 1 from public.tenant_products
      where tenant_id = public.current_producao_actor_tenant_id() and product = 'producao' and status = 'active'
    )
    and public.current_profile_has_product_access('producao')
  );
$$;
