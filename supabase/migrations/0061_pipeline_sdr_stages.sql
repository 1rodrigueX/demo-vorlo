-- Atualiza o pipeline de tenants JÁ existentes pro novo modelo de estágios
-- (a SDR de IA agora move o lead sozinha entre eles — ver sdrPipelineStage.ts):
-- Atendimento SDR -> Qualificado / Não Qualificado -> Proposta -> Fechado.
--
-- Não-destrutivo de propósito: renomeia "Novo" (mantém o id, então negócios
-- que já estavam lá continuam válidos), insere as 2 etapas novas só se
-- ainda não existirem (idempotente), e reposiciona o resto. "Contato" não é
-- removida (pode ter negócios reais nela) — só sai da posição 2 pra não
-- brigar com as novas etapas; quem quiser pode arquivá-la manualmente.
do $$
declare
  t record;
  v_novo_id uuid;
begin
  for t in select id from public.tenants loop
    -- Renomeia "Novo" -> "Atendimento SDR" (case-insensitive, só se existir).
    update public.pipeline_stages
      set name = 'Atendimento SDR', position = 1
      where tenant_id = t.id and lower(name) = 'novo'
      returning id into v_novo_id;

    -- Se não tinha "Novo" (ex: tenant sem CRM ativo ainda), tenta achar se
    -- "Atendimento SDR" já existe (idempotência de reexecução).
    if v_novo_id is null then
      select id into v_novo_id from public.pipeline_stages
        where tenant_id = t.id and lower(name) = 'atendimento sdr';
    end if;

    -- Só segue se o tenant realmente tem pipeline (produto CRM ativo).
    if v_novo_id is not null or exists (select 1 from public.pipeline_stages where tenant_id = t.id) then
      if not exists (select 1 from public.pipeline_stages where tenant_id = t.id and lower(name) = 'qualificado') then
        insert into public.pipeline_stages (tenant_id, name, position, color, is_won, is_lost)
        values (t.id, 'Qualificado', 2, '#0ea5e9', false, false);
      end if;

      if not exists (select 1 from public.pipeline_stages where tenant_id = t.id and lower(name) = 'não qualificado') then
        insert into public.pipeline_stages (tenant_id, name, position, color, is_won, is_lost)
        values (t.id, 'Não Qualificado', 3, '#ef4444', false, true);
      end if;

      update public.pipeline_stages set position = 4 where tenant_id = t.id and lower(name) = 'contato';
      update public.pipeline_stages set position = 5 where tenant_id = t.id and lower(name) = 'proposta';
      update public.pipeline_stages set position = 6 where tenant_id = t.id and lower(name) = 'fechado';
    end if;

    v_novo_id := null;
  end loop;
end $$;
