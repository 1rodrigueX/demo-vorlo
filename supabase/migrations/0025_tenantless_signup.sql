-- Cadastro público (Google OAuth ou e-mail/senha) precisa poder criar um
-- auth.users sem tenant_id — nesse momento o usuário ainda não escolheu
-- plano/pagou, então nenhum tenant existe pra vincular. Antes disso,
-- handle_new_user() (0005_multi_tenant.sql) tentava inserir em profiles
-- com tenant_id NULL, o que violava a constraint NOT NULL e derrubava a
-- criação inteira do usuário. Agora só cria a linha em profiles quando o
-- metadata já traz tenant_id (convite de equipe e criação via painel dev
-- continuam passando por aqui normalmente); cadastro público fica sem
-- profiles até o checkout ser provisionado (ver provision-tenant.ts), que
-- insere a linha diretamente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'tenant_id' then
    insert into public.profiles (id, full_name, tenant_id, role)
    values (
      new.id,
      new.raw_user_meta_data ->> 'full_name',
      (new.raw_user_meta_data ->> 'tenant_id')::uuid,
      coalesce(new.raw_user_meta_data ->> 'role', 'member')
    );
  end if;
  return new;
end;
$$;
