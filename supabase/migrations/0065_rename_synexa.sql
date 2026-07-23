-- Renomeia o assistente embutido de "FALA AI" para "Synexa".
--
-- Só mexe em conteúdo VISÍVEL ao usuário: o nome e o system prompt do agente
-- principal (mostrados na aba Suporte e usados pela própria IA pra se
-- apresentar). Os identificadores internos continuam como estão de propósito
-- (coluna is_fala_ai, valor 'fala_ai' do type, nomes de migrations antigas):
-- são invisíveis ao usuário e renomeá-los seria um refactor arriscado, sem
-- ganho pra quem usa. Isso pode entrar depois na fase de refatoração.

-- 1) Tenants já existentes: troca o nome e a marca dentro do system prompt.
update public.ai_agents
  set name = 'Synexa',
      system_prompt = replace(system_prompt, 'FALA AI', 'Synexa')
  where is_fala_ai = true;

-- 2) Novos tenants: o assistente é semeado pelo trigger handle_new_tenant().
--    Em vez de reproduzir o corpo (grande, com o prompt inteiro) à mão, pega
--    a definição atual da função, troca a marca e re-cria — assim fica em
--    sincronia com qualquer versão que estiver valendo.
do $$
declare
  v_def text;
begin
  select pg_get_functiondef('public.handle_new_tenant()'::regprocedure) into v_def;
  v_def := replace(v_def, 'FALA AI', 'Synexa');
  execute v_def;
end $$;
