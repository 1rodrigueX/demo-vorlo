-- Versões do app desktop (Tauri), para o próprio app se atualizar sem o
-- usuário baixar o instalador de novo.
--
-- O app consulta /api/app/update e recebe o manifesto no formato que o
-- updater do Tauri espera. A `signature` é o conteúdo do arquivo .sig gerado
-- no build — sem ela o Tauri recusa a atualização, que é justamente o que
-- impede alguém de servir um instalador falso no lugar do nosso.

create table public.app_releases (
  id uuid primary key default gen_random_uuid(),
  -- Semver puro ("0.2.0"): o Tauri compara com a versão instalada.
  version text not null unique,
  -- Windows é o único alvo hoje (bundle nsis). Fica preparado pra mais.
  platform text not null default 'windows-x86_64',
  -- URL pública do instalador (.exe do NSIS).
  url text not null,
  -- Conteúdo do .sig gerado junto do instalador.
  signature text not null,
  notes text,
  -- Só uma versão fica publicada por vez; é a que o app enxerga.
  is_published boolean not null default false,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index app_releases_published_idx on public.app_releases (platform, published_at desc)
  where is_published;

alter table public.app_releases enable row level security;

-- Só o time Synexa administra. A leitura pelo app é pública, mas passa pela
-- rota /api/app/update com service role — não pelo PostgREST.
create policy "app_releases_select_dev"
  on public.app_releases for select to authenticated
  using (public.is_dev());

create policy "app_releases_insert_dev"
  on public.app_releases for insert to authenticated
  with check (public.is_dev());

create policy "app_releases_update_dev"
  on public.app_releases for update to authenticated
  using (public.is_dev())
  with check (public.is_dev());

create policy "app_releases_delete_dev"
  on public.app_releases for delete to authenticated
  using (public.is_dev());
