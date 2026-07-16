-- Perfil da empresa: alimenta o agente SDR com contexto sobre o negócio
-- (descrição, site, Instagram, catálogo em PDF, fotos de modelos de
-- produtos) além do que já está no system_prompt do agente. Upload/leitura/
-- exclusão dos arquivos passam sempre pelo server action com o client de
-- service role (mesmo padrão de contact-attachments) — por isso não há
-- policies de storage.objects aqui.
insert into storage.buckets (id, name, public)
values ('company-assets', 'company-assets', false)
on conflict (id) do nothing;

create table public.tenant_company_profile (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  description text,
  website text,
  instagram text,
  catalog_storage_path text,
  catalog_file_name text,
  updated_at timestamptz not null default now()
);

alter table public.tenant_company_profile enable row level security;

-- Qualquer membro do tenant lê (o SDR/agentes de IA rodam com o admin
-- client, então isso é só pra tela de Configurações); só admin edita.
create policy "tenant_company_profile_select_own_tenant"
  on public.tenant_company_profile for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "tenant_company_profile_insert_admin"
  on public.tenant_company_profile for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "tenant_company_profile_update_admin"
  on public.tenant_company_profile for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin())
  with check (tenant_id = public.current_tenant_id());

create trigger set_updated_at
  before update on public.tenant_company_profile
  for each row execute function public.set_updated_at();

create table public.company_product_photos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index company_product_photos_tenant_idx
  on public.company_product_photos (tenant_id, created_at desc);

alter table public.company_product_photos enable row level security;

create policy "company_product_photos_select_own_tenant"
  on public.company_product_photos for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "company_product_photos_insert_admin"
  on public.company_product_photos for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "company_product_photos_delete_admin"
  on public.company_product_photos for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin());
