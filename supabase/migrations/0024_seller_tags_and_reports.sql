-- Tag automática por vendedor (aplicada pelo SDR de IA nos contatos que ele
-- cadastra) — criada sob demanda (lazy) na primeira vez que for necessária,
-- não precisa de backfill aqui.
alter table public.profiles
  add column seller_tag_id uuid references public.tags (id) on delete set null;

-- Necessário pro SDR saber se ainda precisa coletar dados de cadastro deste
-- contato (setado true na criação via WhatsApp; false quando o cadastro é
-- concluído ou um vendedor humano assume a conversa manualmente).
alter table public.contacts
  add column needs_registration boolean not null default false;

-- Mapeamento opcional "vendedor do CRM -> vendedor no Bling" por conexão
-- (cada filial pode ter vendedores cadastrados com ids diferentes dentro do
-- próprio Bling) — usado só se o admin configurar; sem mapeamento, o campo
-- vendedor simplesmente não é enviado ao Bling.
create table public.bling_connection_sellers (
  bling_connection_id uuid not null references public.bling_connections (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  bling_vendedor_id text not null,
  bling_vendedor_name text,
  created_at timestamptz not null default now(),
  primary key (bling_connection_id, profile_id)
);

alter table public.bling_connection_sellers enable row level security;

create policy "bling_connection_sellers_select_admin"
  on public.bling_connection_sellers for select to authenticated
  using (
    exists (
      select 1 from public.bling_connections bc
      where bc.id = bling_connection_sellers.bling_connection_id
        and bc.tenant_id = public.current_tenant_id()
        and public.is_admin()
    )
  );

create policy "bling_connection_sellers_insert_admin"
  on public.bling_connection_sellers for insert to authenticated
  with check (
    exists (
      select 1 from public.bling_connections bc
      where bc.id = bling_connection_sellers.bling_connection_id
        and bc.tenant_id = public.current_tenant_id()
        and public.is_admin()
    )
  );

create policy "bling_connection_sellers_update_admin"
  on public.bling_connection_sellers for update to authenticated
  using (
    exists (
      select 1 from public.bling_connections bc
      where bc.id = bling_connection_sellers.bling_connection_id
        and bc.tenant_id = public.current_tenant_id()
        and public.is_admin()
    )
  )
  with check (
    exists (
      select 1 from public.bling_connections bc
      where bc.id = bling_connection_sellers.bling_connection_id
        and bc.tenant_id = public.current_tenant_id()
        and public.is_admin()
    )
  );

create policy "bling_connection_sellers_delete_admin"
  on public.bling_connection_sellers for delete to authenticated
  using (
    exists (
      select 1 from public.bling_connections bc
      where bc.id = bling_connection_sellers.bling_connection_id
        and bc.tenant_id = public.current_tenant_id()
        and public.is_admin()
    )
  );

-- Chaves de API pro tenant expor os dados do dashboard pra ferramentas de BI
-- (ex: Power BI via "Obter Dados > Web"). Só o hash é guardado; a chave em
-- texto puro é mostrada uma única vez na criação.
create table public.tenant_api_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  created_by uuid references auth.users (id) on delete set null,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index tenant_api_keys_hash_idx on public.tenant_api_keys (key_hash);
create index tenant_api_keys_tenant_idx on public.tenant_api_keys (tenant_id);

alter table public.tenant_api_keys enable row level security;

-- Nunca expõe key_hash pro client-side em select nenhuma tela lista/gera
-- via server action, mas a RLS ainda restringe a admin do tenant por defesa
-- em profundidade.
create policy "tenant_api_keys_select_admin"
  on public.tenant_api_keys for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "tenant_api_keys_insert_admin"
  on public.tenant_api_keys for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.is_admin());

create policy "tenant_api_keys_delete_admin"
  on public.tenant_api_keys for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_admin());
