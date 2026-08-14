-- Multi-empresa (CNPJ/filial) por tenant: um CRM+ERP pode representar mais
-- de uma empresa (matriz + filiais), cada uma com seu próprio regime
-- tributário. A 1ª empresa (matriz) é sempre grátis; empresas extras exigem
-- o Suporte conceder um slot (ver tenants.erp_extra_empresas_granted e a
-- tool solicitar_empresa_extra do Vorlo).
--
-- Mesma convenção de 0079_erp_cadastros.sql: id/tenant_id fk cascade,
-- índice único, RLS com as 4 policies "_own_tenant" gated por
-- current_tenant_has_erp(null::uuid).

create table public.erp_empresas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  cnpj text not null,
  regime_tributario text not null default 'simples'
    check (regime_tributario in ('simples', 'presumido', 'real')),
  is_matriz boolean not null default false,
  city text,
  state text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now()
);
create unique index erp_empresas_tenant_cnpj_idx on public.erp_empresas (tenant_id, cnpj);
-- Só uma matriz por tenant (índice parcial: não conflita entre filiais).
create unique index erp_empresas_tenant_matriz_idx on public.erp_empresas (tenant_id) where is_matriz;

alter table public.erp_empresas enable row level security;

create policy "erp_empresas_select_own_tenant" on public.erp_empresas for select to authenticated
  using (tenant_id = public.current_tenant_id(null::uuid) and public.current_tenant_has_erp(null::uuid));
create policy "erp_empresas_insert_own_tenant" on public.erp_empresas for insert to authenticated
  with check (tenant_id = public.current_tenant_id(null::uuid) and public.current_tenant_has_erp(null::uuid));
create policy "erp_empresas_update_own_tenant" on public.erp_empresas for update to authenticated
  using (tenant_id = public.current_tenant_id(null::uuid) and public.current_tenant_has_erp(null::uuid))
  with check (tenant_id = public.current_tenant_id(null::uuid) and public.current_tenant_has_erp(null::uuid));
create policy "erp_empresas_delete_own_tenant" on public.erp_empresas for delete to authenticated
  using (tenant_id = public.current_tenant_id(null::uuid) and public.current_tenant_has_erp(null::uuid));

-- Quantos slots de empresa ALÉM da 1ª (grátis) o Suporte já concedeu.
alter table public.tenants add column erp_extra_empresas_granted int not null default 0;

-- De qual empresa/filial é a proposta — nulo permitido (tenant com só 1
-- empresa não precisa escolher; propostas antigas ficam sem essa info).
alter table public.erp_propostas add column empresa_id uuid references public.erp_empresas (id) on delete set null;
