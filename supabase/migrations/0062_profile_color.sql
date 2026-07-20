-- Cor por vendedor, escolhida na hora de criar o usuário no painel do dono
-- (ver createTeamMemberWithAccess) — usada pra distinguir vendedores no
-- pipeline (DealCard). Default fixo só existe pro insert nunca falhar;
-- o backfill abaixo já distribui uma cor diferente por vendedor existente,
-- em vez de deixar todo mundo cair na mesma cor.
alter table public.profiles add column color text not null default '#6366f1';

do $$
declare
  t record;
  p record;
  palette text[] := array['#3987e5', '#008300', '#d55181', '#c98500', '#d95926', '#9085e9', '#e66767'];
  i int;
begin
  for t in select id from public.tenants loop
    i := 0;
    for p in select id from public.profiles where tenant_id = t.id order by created_at loop
      update public.profiles set color = palette[(i % array_length(palette, 1)) + 1] where id = p.id;
      i := i + 1;
    end loop;
  end loop;
end $$;
