-- Tamanho de texto por tenant, pra completar o tema junto com brand_color e
-- brand_font (que já existia mas nunca tinha sido ligado na UI).
alter table public.tenants
  add column text_size text not null default 'medium'
  check (text_size in ('small', 'medium', 'large'));
