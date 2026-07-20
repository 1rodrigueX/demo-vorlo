-- Conexão bancária (Open Finance) pro Controle de Finanças — só no
-- contexto Pessoal. Por enquanto roda em modo simulado (provider 'mock'):
-- sem credenciais reais de nenhum agregador ainda, então "conectar" gera
-- lançamentos de exemplo pra já poder construir e testar toda a experiência
-- (extrato importado, gasto de cartão, dica de economia) antes de decidir
-- com qual agregador (Pluggy/Belvo) ir pra produção.

alter table public.financas_lancamentos
  add column source text not null default 'manual' check (source in ('manual', 'open_finance')),
  add column payment_method text check (payment_method in ('pix', 'boleto', 'cartao_credito', 'debito')),
  add column external_id text;

-- external_id identifica a transação no banco de origem — evita duplicar ao
-- ressincronizar (mesmo dado importado de novo cai em "on conflict do nothing").
create unique index financas_lancamentos_tenant_external_id_idx
  on public.financas_lancamentos (tenant_id, external_id)
  where external_id is not null;

create table public.financas_bank_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants (id) on delete cascade,
  provider text not null default 'mock' check (provider in ('mock')),
  institution_name text not null default 'Banco Simulado',
  status text not null default 'disconnected' check (status in ('disconnected', 'connected')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.financas_bank_connections enable row level security;

create policy "financas_bank_connections_select_own_tenant"
  on public.financas_bank_connections for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_financas());

create policy "financas_bank_connections_insert_own_tenant"
  on public.financas_bank_connections for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_financas());

create policy "financas_bank_connections_update_own_tenant"
  on public.financas_bank_connections for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_financas())
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_financas());
