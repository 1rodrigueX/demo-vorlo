-- Liga o Controle Empresarial ao CRM (negócio ganho vira receita pendente
-- na Caixa de Entrada) e adiciona um Controle de Estoque cuja entrada
-- (compra) já lança automaticamente como saída em Empresarial. Pessoal
-- continua isolado (extrato bancário simulado + dica de economia) — cada
-- contexto tem sua própria fonte automática de lançamentos.

alter table public.financas_lancamentos
  drop constraint financas_lancamentos_source_check,
  add constraint financas_lancamentos_source_check
    check (source in ('manual', 'open_finance', 'crm', 'estoque'));

-- ─────────────────────────────────────────────────────────────────────────
-- Caixa de entrada: negócio ganho no pipeline vira um item pendente aqui
-- (não cai direto no extrato) até o dono aprovar ou descartar.
-- ─────────────────────────────────────────────────────────────────────────
create table public.financas_inbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  source text not null check (source in ('crm_deal')),
  reference_id uuid,
  type text not null check (type in ('receita', 'despesa')),
  category text not null,
  description text,
  amount_cents bigint not null check (amount_cents > 0),
  entry_date date not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index financas_inbox_source_reference_idx
  on public.financas_inbox (source, reference_id)
  where reference_id is not null;
create index financas_inbox_tenant_status_idx on public.financas_inbox (tenant_id, status);

alter table public.financas_inbox enable row level security;

create policy "financas_inbox_select_own_tenant"
  on public.financas_inbox for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_financas());

create policy "financas_inbox_update_own_tenant"
  on public.financas_inbox for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_financas())
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_financas());

-- Sem policy de insert: só o backend (service role, via createDealWonInboxEntry)
-- cria itens aqui — o usuário só aprova/descarta.

-- ─────────────────────────────────────────────────────────────────────────
-- Estoque
-- ─────────────────────────────────────────────────────────────────────────
create table public.estoque_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  unit text not null default 'un',
  quantity numeric(12, 3) not null default 0,
  unit_cost_cents bigint not null default 0,
  created_at timestamptz not null default now()
);

create unique index estoque_itens_tenant_name_idx on public.estoque_itens (tenant_id, lower(name));

alter table public.estoque_itens enable row level security;

create policy "estoque_itens_select_own_tenant"
  on public.estoque_itens for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_financas());
create policy "estoque_itens_insert_own_tenant"
  on public.estoque_itens for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_financas());
create policy "estoque_itens_update_own_tenant"
  on public.estoque_itens for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_financas())
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_financas());
create policy "estoque_itens_delete_own_tenant"
  on public.estoque_itens for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_financas());

create table public.estoque_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  item_id uuid not null references public.estoque_itens (id) on delete cascade,
  type text not null check (type in ('entrada', 'saida')),
  quantity numeric(12, 3) not null check (quantity > 0),
  unit_cost_cents bigint not null default 0,
  total_cents bigint not null default 0,
  note text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index estoque_movimentacoes_tenant_item_idx on public.estoque_movimentacoes (tenant_id, item_id, created_at desc);

alter table public.estoque_movimentacoes enable row level security;

create policy "estoque_movimentacoes_select_own_tenant"
  on public.estoque_movimentacoes for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_financas());
create policy "estoque_movimentacoes_insert_own_tenant"
  on public.estoque_movimentacoes for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_financas());
