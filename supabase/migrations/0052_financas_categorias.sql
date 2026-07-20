-- Categorias de receita/despesa deixam de ser uma lista fixa no código pra
-- virar dado por tenant — cada empresa pode criar as próprias além das
-- padrão, gerenciadas em /financeiro/configuracoes.
create table public.financas_categorias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  type text not null check (type in ('receita', 'despesa')),
  name text not null,
  color text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create unique index financas_categorias_tenant_type_name_idx
  on public.financas_categorias (tenant_id, type, lower(name));
create index financas_categorias_tenant_idx
  on public.financas_categorias (tenant_id, type, position);

alter table public.financas_categorias enable row level security;

create policy "financas_categorias_select_own_tenant"
  on public.financas_categorias for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_financas());

create policy "financas_categorias_insert_own_tenant"
  on public.financas_categorias for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_financas());

create policy "financas_categorias_delete_own_tenant"
  on public.financas_categorias for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_financas());

-- Backfill: mesma paleta categórica validada (dataviz skill) já usada no
-- dashboard, pras empresas de Finanças criadas antes dessa tabela existir
-- não ficarem sem categoria nenhuma.
insert into public.financas_categorias (tenant_id, type, name, color, position)
select tp.tenant_id, cat.type, cat.name, cat.color, cat.position
from public.tenant_products tp
cross join (values
  ('despesa', 'Moradia',       '#3987e5', 1),
  ('despesa', 'Subsistência',  '#008300', 2),
  ('despesa', 'Transporte',    '#d55181', 3),
  ('despesa', 'Saúde',         '#c98500', 4),
  ('despesa', 'Lazer',         '#199e70', 5),
  ('despesa', 'Vestuário',     '#d95926', 6),
  ('receita', 'Salário',       '#3987e5', 1),
  ('receita', 'Outras Receitas','#d55181', 2)
) as cat(type, name, color, position)
where tp.product = 'financas' and tp.status = 'active'
on conflict do nothing;
