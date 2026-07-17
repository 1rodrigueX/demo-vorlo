-- Remove a customização de aparência por tenant (cor de marca, fundo, texto,
-- fonte, raio de borda) — o visual do CRM passa a ser único e fixo pra todo
-- mundo (definido em src/app/globals.css + src/components/layout/Sidebar.tsx),
-- não editável pelo dono do CRM. Logo e som de clique continuam
-- personalizáveis (não são "cor/fundo/fonte").
alter table public.tenants
  drop column brand_color,
  drop column brand_font,
  drop column text_size,
  drop column border_radius,
  drop column background_color,
  drop column text_color;
