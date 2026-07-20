-- Contas de funcionário + apontamento de produção (a parte que consome
-- matéria-prima e soma produto acabado no estoque).
--
-- Funcionário tem login de verdade (auth.users), mas DE PROPÓSITO fica de
-- fora da tabela profiles — o trigger handle_new_user só cria uma linha em
-- profiles quando raw_user_meta_data tem 'tenant_id' (ver
-- 0025_tenantless_signup.sql); a conta do funcionário é criada SEM esse
-- campo, então ele nunca ganha um profiles row e current_tenant_id()
-- (que lê de profiles) retorna null pra ele. Isso isola completamente o
-- funcionário do resto do tenant: RLS de CRM/Financeiro/Transportadora/
-- Estoque continua barrando ele em tudo, porque todas checam
-- current_tenant_id(). O tenant do funcionário fica só em
-- producao_funcionarios, e só as tabelas de produção sabem olhar lá.

create table public.producao_funcionarios (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  full_name text not null,
  turno_id uuid references public.producao_turnos (id) on delete set null,
  maquina_id uuid references public.producao_maquinas (id) on delete set null,
  created_at timestamptz not null default now()
);
create index producao_funcionarios_tenant_idx on public.producao_funcionarios (tenant_id);
alter table public.producao_funcionarios enable row level security;

-- tenant "efetivo" de quem está chamando: dono (via profiles) OU
-- funcionário (via producao_funcionarios) — nunca os dois ao mesmo tempo.
create or replace function public.current_producao_actor_tenant_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select tenant_id from public.profiles where id = auth.uid()),
    (select tenant_id from public.producao_funcionarios where id = auth.uid())
  );
$$;

create or replace function public.current_tenant_has_producao_actor()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_dev() or exists (
    select 1 from public.tenant_products
    where tenant_id = public.current_producao_actor_tenant_id()
      and product = 'producao'
      and status = 'active'
  );
$$;

create policy "producao_funcionarios_select_owner_or_self"
  on public.producao_funcionarios for select to authenticated
  using (
    (tenant_id = public.current_tenant_id() and public.current_tenant_has_producao())
    or id = auth.uid()
  );

create policy "producao_funcionarios_update_owner"
  on public.producao_funcionarios for update to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_producao())
  with check (tenant_id = public.current_tenant_id() and public.current_tenant_has_producao());

create policy "producao_funcionarios_delete_owner"
  on public.producao_funcionarios for delete to authenticated
  using (tenant_id = public.current_tenant_id() and public.current_tenant_has_producao());
-- Sem policy de insert: a conta é criada via service role (mesmo padrão de
-- createTeamMember) — precisa criar o auth.users primeiro, RLS não entra nisso.

-- Turnos/máquinas/estilos/produtos/receita: funcionário também precisa
-- LER essas listas pra apontar produção (escolher turno, máquina, produto).
-- Escrita continua só do dono (policies de insert/update/delete da 0056
-- não mudam).
do $$
declare
  t text;
begin
  foreach t in array array['producao_turnos', 'producao_maquinas', 'producao_estilos', 'producao_produtos', 'producao_receita_itens']
  loop
    execute format('drop policy "%1$s_select_own_tenant" on public.%1$s;', t);
    execute format(
      'create policy "%1$s_select_owner_or_funcionario" on public.%1$s for select to authenticated
         using (tenant_id = public.current_producao_actor_tenant_id() and public.current_tenant_has_producao_actor());', t);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- Apontamento de produção — o registro transacional em si.
-- ─────────────────────────────────────────────────────────────────────────
create table public.producao_apontamentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  produto_id uuid not null references public.producao_produtos (id) on delete restrict,
  turno_id uuid references public.producao_turnos (id) on delete set null,
  maquina_id uuid references public.producao_maquinas (id) on delete set null,
  estilo_id uuid references public.producao_estilos (id) on delete set null,
  funcionario_id uuid references public.producao_funcionarios (id) on delete set null,
  quantity numeric(12, 3) not null check (quantity > 0),
  note text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);
create index producao_apontamentos_tenant_idx on public.producao_apontamentos (tenant_id, created_at desc);
alter table public.producao_apontamentos enable row level security;

create policy "producao_apontamentos_select_owner_or_funcionario"
  on public.producao_apontamentos for select to authenticated
  using (tenant_id = public.current_producao_actor_tenant_id() and public.current_tenant_has_producao_actor());
-- Sem policy de insert: só entra via registrar_apontamento() abaixo
-- (security definer, já valida acesso por dentro).

-- ─────────────────────────────────────────────────────────────────────────
-- registrar_apontamento: a transação atômica. Valida estoque de TODAS as
-- matérias-primas antes de mexer em qualquer uma (evita baixa parcial se
-- faltar material no meio da receita), consome cada matéria-prima, soma o
-- produto acabado com custo unitário calculado a partir do custo somado
-- das matérias-primas, e grava o apontamento — tudo em uma função só,
-- então ou tudo acontece ou nada acontece.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.registrar_apontamento(
  p_produto_id uuid,
  p_turno_id uuid,
  p_maquina_id uuid,
  p_estilo_id uuid,
  p_quantity numeric,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_funcionario_id uuid;
  v_produto record;
  v_receita record;
  v_estoque_item record;
  v_needed numeric;
  v_total_cost_cents bigint := 0;
  v_unit_cost_cents bigint := 0;
  v_apontamento_id uuid;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantidade deve ser maior que zero';
  end if;

  v_tenant_id := public.current_producao_actor_tenant_id();
  if v_tenant_id is null or not public.current_tenant_has_producao_actor() then
    raise exception 'Sem acesso ao Controle de Produção';
  end if;

  select id into v_funcionario_id from public.producao_funcionarios where id = auth.uid();

  select * into v_produto from public.producao_produtos where id = p_produto_id and tenant_id = v_tenant_id;
  if not found then
    raise exception 'Produto não encontrado';
  end if;

  -- 1ª passada: valida que tem estoque suficiente de TODAS as matérias-primas.
  for v_receita in
    select * from public.producao_receita_itens where produto_id = p_produto_id and tenant_id = v_tenant_id
  loop
    select * into v_estoque_item from public.estoque_itens where id = v_receita.materia_prima_id;
    v_needed := v_receita.quantity_per_unit * p_quantity;
    if v_estoque_item.quantity < v_needed then
      raise exception 'Estoque insuficiente de "%": precisa % %, tem % %',
        v_estoque_item.name, v_needed, v_estoque_item.unit, v_estoque_item.quantity, v_estoque_item.unit;
    end if;
    v_total_cost_cents := v_total_cost_cents + round(v_estoque_item.unit_cost_cents * v_needed);
  end loop;

  -- 2ª passada: consome cada matéria-prima de verdade.
  for v_receita in
    select * from public.producao_receita_itens where produto_id = p_produto_id and tenant_id = v_tenant_id
  loop
    v_needed := v_receita.quantity_per_unit * p_quantity;

    update public.estoque_itens set quantity = quantity - v_needed where id = v_receita.materia_prima_id;

    insert into public.estoque_movimentacoes
      (tenant_id, item_id, type, quantity, unit_cost_cents, total_cents, note, created_by)
    select v_tenant_id, v_receita.materia_prima_id, 'saida', v_needed,
           unit_cost_cents, round(unit_cost_cents * v_needed),
           'Consumo de produção — ' || v_produto.name, auth.uid()
    from public.estoque_itens where id = v_receita.materia_prima_id;
  end loop;

  if p_quantity > 0 then
    v_unit_cost_cents := round(v_total_cost_cents / p_quantity);
  end if;

  update public.estoque_itens
    set quantity = quantity + p_quantity,
        unit_cost_cents = v_unit_cost_cents
    where id = v_produto.estoque_item_id;

  insert into public.estoque_movimentacoes
    (tenant_id, item_id, type, quantity, unit_cost_cents, total_cents, note, created_by)
  values
    (v_tenant_id, v_produto.estoque_item_id, 'entrada', p_quantity, v_unit_cost_cents, v_total_cost_cents,
     'Produção — apontamento', auth.uid());

  insert into public.producao_apontamentos
    (tenant_id, produto_id, turno_id, maquina_id, estilo_id, funcionario_id, quantity, note, created_by)
  values
    (v_tenant_id, p_produto_id, p_turno_id, p_maquina_id, p_estilo_id, v_funcionario_id, p_quantity, p_note, auth.uid())
  returning id into v_apontamento_id;

  return v_apontamento_id;
end;
$$;
