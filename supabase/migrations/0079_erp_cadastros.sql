-- Primeiras tabelas de dados reais do ERP (fase Cadastros — ver plano
-- aprovado). Produtos/Categorias/Fornecedores/Funcionários não têm
-- equivalente real em nenhum outro lugar do sistema (estoque_itens/
-- producao_produtos não têm preço de venda/SKU/categoria, e reaproveitá-los
-- furaria o isolamento de billing entre ERP e Estoque/Produção, que são
-- vendidos separados) — por isso ganham tabelas próprias, prefixo erp_.
--
-- Clientes/Vendedores/Usuários NÃO entram aqui: usam contacts/profiles, que
-- já existem.
--
-- Mesma convenção de Estoque/Produção (0055/0056): id uuid + tenant_id fk
-- cascade + created_at (sem updated_at), dinheiro em bigint ..._cents,
-- índice único (tenant_id, lower(name)), RLS com as 4 policies "_own_tenant"
-- gated por current_tenant_has_erp() — hoje bypassada pelo shim de service
-- role (ver src/lib/supabase/server.ts), mas escrita do mesmo jeito por
-- consistência e pro dia que restaurarem isolamento via RLS.

create table public.erp_categorias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  parent_id uuid references public.erp_categorias (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index erp_categorias_tenant_name_idx on public.erp_categorias (tenant_id, lower(name));
create index erp_categorias_parent_idx on public.erp_categorias (parent_id);

create table public.erp_produtos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  sku text,
  category_id uuid references public.erp_categorias (id) on delete set null,
  unit text not null default 'un',
  cost_price_cents bigint not null default 0,
  sale_price_cents bigint not null default 0,
  quantity numeric(12, 3) not null default 0,
  min_stock numeric(12, 3) not null default 0,
  created_at timestamptz not null default now()
);
create unique index erp_produtos_tenant_name_idx on public.erp_produtos (tenant_id, lower(name));
create unique index erp_produtos_tenant_sku_idx on public.erp_produtos (tenant_id, sku) where sku is not null;
create index erp_produtos_category_idx on public.erp_produtos (category_id);

create table public.erp_fornecedores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  document text,
  email text,
  phone text,
  city text,
  state text,
  category text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now()
);
create unique index erp_fornecedores_tenant_name_idx on public.erp_fornecedores (tenant_id, lower(name));

create table public.erp_funcionarios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  full_name text not null,
  role text,
  department text,
  admission_date date,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now()
);
create index erp_funcionarios_tenant_idx on public.erp_funcionarios (tenant_id);

alter table public.erp_categorias enable row level security;
alter table public.erp_produtos enable row level security;
alter table public.erp_fornecedores enable row level security;
alter table public.erp_funcionarios enable row level security;

-- current_tenant_id()/current_tenant_has_erp() sem argumento ficaram
-- ambíguos depois da migration 0078 (que adicionou o overload com
-- p_user_id uuid default null) — Postgres não escolhe sozinho entre "a
-- função de 0 argumentos" e "a de 1 argumento chamada com o default".
-- current_tenant_id(null::uuid)/current_tenant_has_erp(null::uuid) força o
-- overload novo com p_user_id nulo, que cai em coalesce(null, auth.uid()) —
-- comportamento idêntico ao antigo bare call, só que sem ambiguidade.
do $$
declare
  t text;
begin
  foreach t in array array['erp_categorias', 'erp_produtos', 'erp_fornecedores', 'erp_funcionarios']
  loop
    execute format(
      'create policy "%1$s_select_own_tenant" on public.%1$s for select to authenticated
         using (tenant_id = public.current_tenant_id(null::uuid) and public.current_tenant_has_erp(null::uuid));',
      t
    );
    execute format(
      'create policy "%1$s_insert_own_tenant" on public.%1$s for insert to authenticated
         with check (tenant_id = public.current_tenant_id(null::uuid) and public.current_tenant_has_erp(null::uuid));',
      t
    );
    execute format(
      'create policy "%1$s_update_own_tenant" on public.%1$s for update to authenticated
         using (tenant_id = public.current_tenant_id(null::uuid) and public.current_tenant_has_erp(null::uuid))
         with check (tenant_id = public.current_tenant_id(null::uuid) and public.current_tenant_has_erp(null::uuid));',
      t
    );
    execute format(
      'create policy "%1$s_delete_own_tenant" on public.%1$s for delete to authenticated
         using (tenant_id = public.current_tenant_id(null::uuid) and public.current_tenant_has_erp(null::uuid));',
      t
    );
  end loop;
end $$;
