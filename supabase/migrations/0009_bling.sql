-- Integração com o Bling (ERP): cada tenant registra o próprio app OAuth no
-- Bling e cola aqui o client_id/client_secret dele (igual ao modelo do
-- Twilio) — a plataforma nunca guarda uma credencial compartilhada.
create table public.bling_connections (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  client_id text,
  client_secret text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  connected_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.bling_connections enable row level security;

create policy "bling_connections_select_own"
  on public.bling_connections for select to authenticated
  using (tenant_id = public.current_tenant_id());

create policy "bling_connections_insert_own_admin"
  on public.bling_connections for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "bling_connections_update_own_admin"
  on public.bling_connections for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin())
  with check (tenant_id = public.current_tenant_id());

-- Mapeamento pro id do registro correspondente já criado no Bling, pra não
-- duplicar em re-sincronizações.
alter table public.contacts add column bling_contact_id text;
alter table public.deals add column bling_order_id text;
