-- Propostas reais do ERP + numeração sequencial de documento (não existia em
-- lugar nenhum do sistema) + notificações do ERP (pro sino do Topbar e pro
-- aviso "SDR montou uma proposta" pro vendedor dono do lead).
--
-- Mesma convenção de 0055/0056/0079: id uuid + tenant_id fk cascade,
-- dinheiro em bigint _cents, RLS com as 4 policies "_own_tenant" gated por
-- current_tenant_has_erp() (dormente hoje — RLS bypassada pelo shim de
-- service role, ver src/lib/supabase/server.ts — mas escrita por
-- consistência e pro dia que restaurarem isolamento).

create table public.erp_contadores (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  doc_type text not null,
  next_number int not null default 1001,
  primary key (tenant_id, doc_type)
);

-- Atômico via UPSERT: o upsert numa mesma PK serializa concorrência —
-- duas propostas criadas ao mesmo tempo não colidem no número.
create or replace function public.next_erp_document_number(p_tenant_id uuid, p_doc_type text, p_prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next int;
begin
  insert into public.erp_contadores (tenant_id, doc_type)
  values (p_tenant_id, p_doc_type)
  on conflict (tenant_id, doc_type) do update set next_number = erp_contadores.next_number + 1
  returning next_number into v_next;

  return p_prefix || '-' || v_next;
end;
$$;

create table public.erp_propostas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  number text not null,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  seller_id uuid references public.profiles (id) on delete set null,
  status text not null default 'rascunho' check (status in
    ('rascunho', 'enviada', 'visualizada', 'negociacao', 'aprovada', 'recusada', 'expirada', 'cancelada')),
  source text not null default 'manual' check (source in ('manual', 'sdr')),
  quote_date date not null default current_date,
  valid_until date,
  payment_term text,
  freight_type text default 'CIF' check (freight_type in ('CIF', 'FOB')),
  carrier_id uuid references public.erp_fornecedores (id) on delete set null,
  freight_cents bigint not null default 0,
  discount_cents bigint not null default 0,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create unique index erp_propostas_tenant_number_idx on public.erp_propostas (tenant_id, number);
create index erp_propostas_contact_idx on public.erp_propostas (contact_id);
create index erp_propostas_tenant_idx on public.erp_propostas (tenant_id, created_at desc);

create table public.erp_proposta_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  proposta_id uuid not null references public.erp_propostas (id) on delete cascade,
  produto_id uuid references public.erp_produtos (id) on delete set null,
  product_name_snapshot text not null,
  quantity numeric(12, 3) not null check (quantity > 0),
  unit_price_cents bigint not null default 0,
  discount_pct numeric(5, 2) not null default 0
);
create index erp_proposta_itens_proposta_idx on public.erp_proposta_itens (proposta_id);

create table public.erp_notificacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index erp_notificacoes_profile_idx on public.erp_notificacoes (profile_id, read_at);

alter table public.erp_propostas enable row level security;
alter table public.erp_proposta_itens enable row level security;
alter table public.erp_notificacoes enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['erp_propostas', 'erp_proposta_itens']
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

-- erp_notificacoes: cada um só vê/marca como lidas as suas (não é por
-- tenant_id igual as outras — é por dono da notificação).
create policy "erp_notificacoes_select_own"
  on public.erp_notificacoes for select to authenticated
  using (profile_id = auth.uid());
create policy "erp_notificacoes_update_own"
  on public.erp_notificacoes for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
