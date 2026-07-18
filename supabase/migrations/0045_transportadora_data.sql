-- Dados do app Transportadora (apps/frete-app): espelha campo a campo os
-- models Dart (Cliente, Motorista, Frete, ConfiguracoesRepository), em
-- snake_case, isolados por tenant_id.
--
-- RLS aqui é a fronteira de segurança de verdade (não só uma tela do app) —
-- toda policy checa tenant_id = current_tenant_id() *e*
-- current_tenant_has_transportadora() (migration 0044, que já cobre o bypass
-- do dev via is_dev()). Sem separação por role (owner/manager/member): quem
-- é do tenant e tem o produto ativo lê/escreve tudo, mesmo modelo do app
-- hoje (uma "caixa" só, compartilhada).

create table public.transportadora_clientes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  nome text not null,
  telefone text not null default '',
  documento text not null default '',
  endereco text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transportadora_motoristas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  nome text not null,
  telefone text not null default '',
  cnh text not null default '',
  placa_veiculo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transportadora_fretes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  cliente_id uuid not null references public.transportadora_clientes (id) on delete restrict,
  motorista_id uuid not null references public.transportadora_motoristas (id) on delete restrict,
  origem text not null,
  destino text not null,
  data timestamptz not null,
  distancia_km numeric not null default 0,
  valor_por_km numeric not null default 0,
  margem_lucro_percentual numeric not null default 0,
  valor_frete numeric not null default 0,
  calcular_por_km boolean not null default true,
  status text not null default 'cotacao'
    check (status in ('cotacao', 'em_andamento', 'concluido', 'perdido')),
  numero_nf text not null default '',
  observacoes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Uma linha por tenant — o ConfiguracoesRepository do app hoje é uma caixa
-- Hive só com a chave fatorImposto, não precisa de uma tabela genérica de
-- settings pra isso.
create table public.transportadora_configuracoes (
  tenant_id uuid primary key references public.tenants (id),
  fator_imposto numeric not null default 0.85,
  updated_at timestamptz not null default now()
);

create index transportadora_clientes_tenant_id_idx on public.transportadora_clientes (tenant_id);
create index transportadora_motoristas_tenant_id_idx on public.transportadora_motoristas (tenant_id);
create index transportadora_fretes_tenant_id_idx on public.transportadora_fretes (tenant_id);

create trigger set_updated_at before update on public.transportadora_clientes
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.transportadora_motoristas
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.transportadora_fretes
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.transportadora_configuracoes
  for each row execute function public.set_updated_at();

alter table public.transportadora_clientes enable row level security;
alter table public.transportadora_motoristas enable row level security;
alter table public.transportadora_fretes enable row level security;
alter table public.transportadora_configuracoes enable row level security;

create policy "transportadora_clientes_select" on public.transportadora_clientes
  for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_transportadora());
create policy "transportadora_clientes_insert" on public.transportadora_clientes
  for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_transportadora());
create policy "transportadora_clientes_update" on public.transportadora_clientes
  for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_transportadora())
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_transportadora());
create policy "transportadora_clientes_delete" on public.transportadora_clientes
  for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_transportadora());

create policy "transportadora_motoristas_select" on public.transportadora_motoristas
  for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_transportadora());
create policy "transportadora_motoristas_insert" on public.transportadora_motoristas
  for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_transportadora());
create policy "transportadora_motoristas_update" on public.transportadora_motoristas
  for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_transportadora())
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_transportadora());
create policy "transportadora_motoristas_delete" on public.transportadora_motoristas
  for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_transportadora());

create policy "transportadora_fretes_select" on public.transportadora_fretes
  for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_transportadora());
create policy "transportadora_fretes_insert" on public.transportadora_fretes
  for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_transportadora());
create policy "transportadora_fretes_update" on public.transportadora_fretes
  for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_transportadora())
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_transportadora());
create policy "transportadora_fretes_delete" on public.transportadora_fretes
  for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_transportadora());

create policy "transportadora_configuracoes_select" on public.transportadora_configuracoes
  for select to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_transportadora());
create policy "transportadora_configuracoes_insert" on public.transportadora_configuracoes
  for insert to authenticated
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_transportadora());
create policy "transportadora_configuracoes_update" on public.transportadora_configuracoes
  for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_transportadora())
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_transportadora());
