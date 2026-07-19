-- Bucket privado pra guardar os dumps do backup diário automático (ver
-- /api/cron/backup) — mesmo padrão de company-assets: só o service role
-- toca aqui, sem policies de storage.objects.
insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;
