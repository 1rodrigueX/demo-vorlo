-- Relatório de produção real (chão de fábrica) sempre tem uma coluna de
-- PERDAS ao lado da quantidade produzida — unidade que saiu defeituosa/
-- perdida no processo. Isso ainda consome matéria-prima (o material foi
-- usado), mas não vira estoque de produto acabado.

alter table public.producao_apontamentos
  add column perdas numeric(12, 3) not null default 0 check (perdas >= 0);

-- Antes exigia quantity > 0 — agora um apontamento pode ser só perda (lote
-- inteiro perdido, quantity = 0), então relaxa pra >= 0 e garante que pelo
-- menos um dos dois números é positivo.
alter table public.producao_apontamentos drop constraint producao_apontamentos_quantity_check;
alter table public.producao_apontamentos
  add constraint producao_apontamentos_quantity_check check (quantity >= 0);
alter table public.producao_apontamentos
  add constraint producao_apontamentos_quantity_or_perdas_check check (quantity > 0 or perdas > 0);

create or replace function public.registrar_apontamento(
  p_produto_id uuid,
  p_turno_id uuid,
  p_maquina_id uuid,
  p_estilo_id uuid,
  p_quantity numeric,
  p_note text,
  p_perdas numeric default 0
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
  v_total_produced numeric;
  v_needed numeric;
  v_total_cost_cents bigint := 0;
  v_unit_cost_cents bigint := 0;
  v_apontamento_id uuid;
begin
  if p_quantity is null or p_quantity < 0 then
    raise exception 'Quantidade inválida';
  end if;
  if p_perdas is null or p_perdas < 0 then
    raise exception 'Perdas inválidas';
  end if;
  if p_quantity = 0 and p_perdas = 0 then
    raise exception 'Informe quantidade produzida ou perdas';
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

  -- matéria-prima é consumida pelo total tentado (produzido + perdido),
  -- já que o material foi gasto nas duas situações.
  v_total_produced := p_quantity + p_perdas;

  -- 1ª passada: valida que tem estoque suficiente de TODAS as matérias-primas.
  for v_receita in
    select * from public.producao_receita_itens where produto_id = p_produto_id and tenant_id = v_tenant_id
  loop
    select * into v_estoque_item from public.estoque_itens where id = v_receita.materia_prima_id;
    v_needed := v_receita.quantity_per_unit * v_total_produced;
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
    v_needed := v_receita.quantity_per_unit * v_total_produced;

    update public.estoque_itens set quantity = quantity - v_needed where id = v_receita.materia_prima_id;

    insert into public.estoque_movimentacoes
      (tenant_id, item_id, type, quantity, unit_cost_cents, total_cents, note, created_by)
    select v_tenant_id, v_receita.materia_prima_id, 'saida', v_needed,
           unit_cost_cents, round(unit_cost_cents * v_needed),
           'Consumo de produção — ' || v_produto.name, auth.uid()
    from public.estoque_itens where id = v_receita.materia_prima_id;
  end loop;

  -- Só a quantidade BOA vira estoque de produto acabado — perdas não entram.
  if p_quantity > 0 then
    if v_total_produced > 0 then
      v_unit_cost_cents := round(v_total_cost_cents / v_total_produced);
    end if;

    update public.estoque_itens
      set quantity = quantity + p_quantity,
          unit_cost_cents = v_unit_cost_cents
      where id = v_produto.estoque_item_id;

    insert into public.estoque_movimentacoes
      (tenant_id, item_id, type, quantity, unit_cost_cents, total_cents, note, created_by)
    values
      (v_tenant_id, v_produto.estoque_item_id, 'entrada', p_quantity, v_unit_cost_cents,
       round(v_unit_cost_cents * p_quantity), 'Produção — apontamento', auth.uid());
  end if;

  insert into public.producao_apontamentos
    (tenant_id, produto_id, turno_id, maquina_id, estilo_id, funcionario_id, quantity, perdas, note, created_by)
  values
    (v_tenant_id, p_produto_id, p_turno_id, p_maquina_id, p_estilo_id, v_funcionario_id, p_quantity, p_perdas, p_note, auth.uid())
  returning id into v_apontamento_id;

  return v_apontamento_id;
end;
$$;
