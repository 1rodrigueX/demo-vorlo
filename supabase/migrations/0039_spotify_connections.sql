-- Conexao pessoal do Spotify: diferente de Bling/Anthropic (por tenant), o
-- Spotify e conectado por USUARIO — cada vendedor loga com a propria conta
-- (precisa ser Premium pra tocar faixa completa via Web Playback SDK).
create table public.user_spotify_connections (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  spotify_user_id text,
  product text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_spotify_connections enable row level security;

create policy "user_spotify_connections_select_own"
  on public.user_spotify_connections for select to authenticated
  using (profile_id = auth.uid());

create policy "user_spotify_connections_insert_own"
  on public.user_spotify_connections for insert to authenticated
  with check (profile_id = auth.uid());

create policy "user_spotify_connections_update_own"
  on public.user_spotify_connections for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "user_spotify_connections_delete_own"
  on public.user_spotify_connections for delete to authenticated
  using (profile_id = auth.uid());

create trigger set_updated_at
  before update on public.user_spotify_connections
  for each row execute function public.set_updated_at();
