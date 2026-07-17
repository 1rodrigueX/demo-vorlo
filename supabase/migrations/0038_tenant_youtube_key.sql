-- Chave da YouTube Data API v3 por tenant, pra busca de musica em /musica
-- (estilo Spotify) em vez de exigir colar link direto.
alter table public.tenants add column youtube_api_key text;
