-- Mais opções de aparência por tenant: estilo de borda, cor de fundo/texto
-- personalizadas (sobrescrevem o tema escuro padrão quando definidas) e som
-- de clique customizado.
alter table public.tenants
  add column border_radius text not null default 'default'
    check (border_radius in ('square', 'default', 'rounded', 'pill')),
  add column background_color text,
  add column text_color text,
  add column click_sound_path text;
