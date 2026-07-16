-- Catálogo deixa de ser "1 arquivo por empresa" (colunas em
-- tenant_company_profile) e vira lista, igual company_product_photos —
-- o tenant pode ter mais de um catálogo (linha de produtos, promoções etc.).
-- Sem dado real a migrar: nenhum upload de catálogo tinha sido concluído
-- ainda (o bug do nome de arquivo com acento/espaço impedia).
create table public.company_catalogs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

create index company_catalogs_tenant_idx
  on public.company_catalogs (tenant_id, created_at desc);

alter table public.company_catalogs enable row level security;

create policy "company_catalogs_select_own_tenant"
  on public.company_catalogs for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "company_catalogs_insert_admin"
  on public.company_catalogs for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "company_catalogs_delete_admin"
  on public.company_catalogs for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin());

alter table public.tenant_company_profile
  drop column catalog_storage_path,
  drop column catalog_file_name;
