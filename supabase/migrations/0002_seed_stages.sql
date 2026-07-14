-- Estágios padrão do pipeline de vendas.
insert into public.pipeline_stages (name, position, color, is_won, is_lost) values
  ('Novo', 1, '#6366f1', false, false),
  ('Contato', 2, '#0ea5e9', false, false),
  ('Proposta', 3, '#f59e0b', false, false),
  ('Fechado', 4, '#22c55e', true, false);
