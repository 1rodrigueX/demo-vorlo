-- Controle de Produção — quinto produto independente (como CRM/Transportadora/
-- Finanças/Estoque). Essa migration cobre a parte configurável pelo dono:
-- turnos, máquinas, estilos de produção e o catálogo de produtos com ficha
-- técnica (receita de matéria-prima). Contas de funcionário e o apontamento
-- de produção em si (a parte que baixa estoque) vêm numa migration seguinte.
--
-- Produção depende de Estoque estar ativo pra poder linkar produtos —
-- checado na aplicação (não é FK obrigatória pro tenant_products), mesmo
-- padrão do link Estoque→Finanças.

create table public.producao_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  monthly_price_cents int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.producao_plans (name, is_default, monthly_price_cents)
  values ('Produção', true, 7990);

alter table public.tenant_products drop constraint tenant_products_product_check;
alter table public.tenant_products
  add constraint tenant_products_product_check
    check (product in ('transportadora', 'financas', 'estoque', 'producao'));

create or replace function public.current_tenant_has_producao()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_dev() or exists (
    select 1 from public.tenant_products
    where tenant_id = public.current_tenant_id()
      and product = 'producao'
      and status = 'active'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Turnos, máquinas e estilos — totalmente customizáveis pelo dono.
-- ─────────────────────────────────────────────────────────────────────────
create table public.producao_turnos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  start_time time,
  end_time time,
  created_at timestamptz not null default now()
);
create unique index producao_turnos_tenant_name_idx on public.producao_turnos (tenant_id, lower(name));
alter table public.producao_turnos enable row level security;

create table public.producao_maquinas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  status text not null default 'ativa' check (status in ('ativa', 'manutencao', 'parada')),
  created_at timestamptz not null default now()
);
create unique index producao_maquinas_tenant_name_idx on public.producao_maquinas (tenant_id, lower(name));
alter table public.producao_maquinas enable row level security;

create table public.producao_estilos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);
create unique index producao_estilos_tenant_name_idx on public.producao_estilos (tenant_id, lower(name));
alter table public.producao_estilos enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- Produtos + ficha técnica (receita): cada produto acabado é ligado a um
-- item de estoque (onde a quantidade produzida entra), e sua receita lista
-- quanto de cada item de estoque (matéria-prima) é consumido por unidade.
-- ─────────────────────────────────────────────────────────────────────────
create table public.producao_produtos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  estoque_item_id uuid not null references public.estoque_itens (id) on delete restrict,
  created_at timestamptz not null default now()
);
create unique index producao_produtos_tenant_name_idx on public.producao_produtos (tenant_id, lower(name));
create index producao_produtos_estoque_item_idx on public.producao_produtos (estoque_item_id);
alter table public.producao_produtos enable row level security;

create table public.producao_receita_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  produto_id uuid not null references public.producao_produtos (id) on delete cascade,
  materia_prima_id uuid not null references public.estoque_itens (id) on delete restrict,
  quantity_per_unit numeric(12, 4) not null check (quantity_per_unit > 0),
  created_at timestamptz not null default now()
);
create unique index producao_receita_itens_produto_materia_idx
  on public.producao_receita_itens (produto_id, materia_prima_id);
alter table public.producao_receita_itens enable row level security;

-- Todas as tabelas de config acima seguem o mesmo padrão de RLS: só o dono
-- (current_tenant_id()) gerencia, exige o produto ativo.
do $$
declare
  t text;
begin
  foreach t in array array['producao_turnos', 'producao_maquinas', 'producao_estilos', 'producao_produtos', 'producao_receita_itens']
  loop
    execute format(
      'create policy "%1$s_select_own_tenant" on public.%1$s for select to authenticated
         using (tenant_id = public.current_tenant_id() and public.current_tenant_has_producao());', t);
    execute format(
      'create policy "%1$s_insert_own_tenant" on public.%1$s for insert to authenticated
         with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_producao());', t);
    execute format(
      'create policy "%1$s_update_own_tenant" on public.%1$s for update to authenticated
         using (tenant_id = public.current_tenant_id() and public.current_tenant_has_producao())
         with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_producao());', t);
    execute format(
      'create policy "%1$s_delete_own_tenant" on public.%1$s for delete to authenticated
         using (tenant_id = public.current_tenant_id() and public.current_tenant_has_producao());', t);
  end loop;
end $$;
