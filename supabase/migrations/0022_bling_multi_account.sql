-- Bling passa a suportar várias contas por tenant (ex: uma por filial),
-- roteadas pela tag do contato — antes era 1:1 (tenant_id era a própria PK).
-- A conexão existente de cada tenant vira a "is_default" automaticamente.
alter table public.bling_connections
  add column id uuid not null default gen_random_uuid(),
  add column name text not null default 'Principal',
  add column is_default boolean not null default true,
  add column tag_id uuid references public.tags (id) on delete set null;

alter table public.bling_connections drop constraint bling_connections_pkey;
alter table public.bling_connections add primary key (id);

create index bling_connections_tenant_idx on public.bling_connections (tenant_id);

-- Só uma conexão default por tenant, e uma tag só roteia pra 1 conexão.
create unique index bling_connections_one_default_idx
  on public.bling_connections (tenant_id) where is_default;
create unique index bling_connections_tenant_tag_idx
  on public.bling_connections (tenant_id, tag_id) where tag_id is not null;

-- Não existia policy de delete antes (fazia sentido quando só se editava a
-- linha única do tenant); agora dá pra remover uma filial, exceto a default.
create policy "bling_connections_delete_own_admin"
  on public.bling_connections for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin() and not is_default);
