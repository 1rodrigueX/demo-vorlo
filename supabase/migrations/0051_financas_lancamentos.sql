-- Lançamentos (receitas/despesas) do Controle de Finanças — dado real por
-- trás do dashboard em /financeiro. `context` separa pessoal de empresarial
-- dentro do MESMO tenant (a pessoa/dono pode acompanhar as duas vidas
-- financeiras no mesmo produto, sem precisar de tenant separado pra isso).
create table public.financas_lancamentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  context text not null check (context in ('pessoal', 'empresarial')),
  type text not null check (type in ('receita', 'despesa')),
  category text not null,
  description text,
  amount_cents int not null check (amount_cents > 0),
  entry_date date not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index financas_lancamentos_tenant_idx
  on public.financas_lancamentos (tenant_id, context, entry_date desc);

alter table public.financas_lancamentos enable row level security;

create policy "financas_lancamentos_select_own_tenant"
  on public.financas_lancamentos for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_financas());

create policy "financas_lancamentos_insert_own_tenant"
  on public.financas_lancamentos for insert to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_tenant_has_financas()
    and created_by = auth.uid()
  );

create policy "financas_lancamentos_delete_own_tenant"
  on public.financas_lancamentos for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_financas());
