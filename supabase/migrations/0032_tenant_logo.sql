-- Logo da empresa, exibida na sidebar no lugar do quadrado com a inicial do
-- nome. Guarda só o caminho no bucket privado company-assets (mesmo padrão
-- de catálogo/fotos em 0028_company_profile.sql) — a URL assinada é gerada
-- sob demanda em cada request.
alter table public.tenants add column logo_storage_path text;
