-- Remove o estágio legado "Contato" do pipeline (sobra do modelo antigo,
-- antes da 0061 introduzir Atendimento SDR/Qualificado/Não Qualificado).
-- Só mexe no pipeline_stages — não apaga contato nem negócio nenhum. Se
-- por acaso sobrou algum negócio nesse estágio, realoca pra "Atendimento
-- SDR" antes de apagar (senão a FK de deals.stage_id barraria o delete).
do $$
declare
  t record;
  v_contato_id uuid;
  v_fallback_id uuid;
begin
  for t in select id from public.tenants loop
    select id into v_contato_id from public.pipeline_stages
      where tenant_id = t.id and lower(name) = 'contato';

    if v_contato_id is not null then
      if exists (select 1 from public.deals where stage_id = v_contato_id) then
        select id into v_fallback_id from public.pipeline_stages
          where tenant_id = t.id and lower(name) = 'atendimento sdr';
        if v_fallback_id is not null then
          update public.deals set stage_id = v_fallback_id where stage_id = v_contato_id;
        end if;
      end if;

      delete from public.pipeline_stages where id = v_contato_id;
    end if;

    v_contato_id := null;
    v_fallback_id := null;
  end loop;
end $$;
