-- Liga a venda do CRM ao Estoque: o vendedor marca quais produtos (e
-- quantidade) foram vendidos num negócio, e ao marcar o negócio como
-- "Ganho" isso abate do estoque automaticamente (ver baixarEstoqueVenda,
-- chamada em updateDealStage). De propósito NÃO bloqueia o fechamento se
-- faltar estoque — só deixa a quantidade negativa como sinal de falta,
-- decisão explícita do dono pra nunca travar o vendedor.

create table public.deal_produtos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  deal_id uuid not null references public.deals (id) on delete cascade,
  estoque_item_id uuid not null references public.estoque_itens (id) on delete restrict,
  quantity numeric(12, 3) not null check (quantity > 0),
  created_at timestamptz not null default now()
);
create index deal_produtos_deal_idx on public.deal_produtos (deal_id);
create index deal_produtos_tenant_idx on public.deal_produtos (tenant_id);

alter table public.deal_produtos enable row level security;

create policy "deal_produtos_select_own_tenant"
  on public.deal_produtos for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_estoque());
create policy "deal_produtos_insert_own_tenant"
  on public.deal_produtos for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_estoque());
create policy "deal_produtos_delete_own_tenant"
  on public.deal_produtos for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_estoque());
