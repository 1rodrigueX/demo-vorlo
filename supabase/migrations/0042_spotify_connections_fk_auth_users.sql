-- user_spotify_connections.profile_id apontava pra public.profiles, mas quem
-- conecta é o usuário autenticado (auth.users), não necessariamente alguém
-- com uma linha em profiles — um dev "visualizando" um tenant (ver
-- dev_active_view) tem profile só sintético (em memória, current-user.ts),
-- sem linha real em profiles, e a troca de código por token do Spotify
-- quebrava com "violates foreign key constraint
-- user_spotify_connections_profile_id_fkey" pra esse caso.
alter table public.user_spotify_connections
  drop constraint user_spotify_connections_profile_id_fkey;

alter table public.user_spotify_connections
  add constraint user_spotify_connections_profile_id_fkey
  foreign key (profile_id) references auth.users (id) on delete cascade;
