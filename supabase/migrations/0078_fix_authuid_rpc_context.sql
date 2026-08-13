-- BUGFIX: desde o cutover pro Auth.js (07/08), auth.uid() nunca mais é
-- alimentado quando essas funções são chamadas via .rpc() — o shim
-- (src/lib/db/queryClient.ts callRpc) roda `SELECT * FROM fn(...)` numa
-- conexão pg direta, sem nunca setar o contexto de sessão que auth.uid() lê.
-- Resultado: is_dev(), current_tenant_id() e todo current_tenant_has_X()
-- sempre avaliam como se ninguém estivesse logado — os gates de billing de
-- Transportadora/Finanças/Estoque/Produção (e agora ERP) sempre bloqueavam,
-- mesmo pra tenant com assinatura ativa.
--
-- Fix: cada função ganha um overload aditivo com p_user_id uuid opcional
-- (default null, cai pra auth.uid() se não informado — sem quebrar quem
-- ainda chama sem argumento, ex.: RLS policies dormentes). O app passa o id
-- do usuário explicitamente (já resolvido via Auth.js/getCurrentUser()).
--
-- Aditivo de propósito: NÃO dropa as versões sem argumento — elas continuam
-- existindo pras RLS policies que as referenciam (hoje dormentes, RLS
-- desligada pelo shim de service role — ver src/lib/supabase/server.ts).
-- Dropar exigiria recriar essas policies; fora de escopo deste bugfix.

create or replace function public.is_dev(p_user_id uuid default null)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.dev_users where id = coalesce(p_user_id, auth.uid()));
$$;

create or replace function public.current_tenant_id(p_user_id uuid default null)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select tenant_id from public.profiles where id = coalesce(p_user_id, auth.uid())),
    (select tenant_id from public.dev_active_view where dev_id = coalesce(p_user_id, auth.uid()))
  );
$$;

create or replace function public.current_producao_actor_tenant_id(p_user_id uuid default null)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select tenant_id from public.profiles where id = coalesce(p_user_id, auth.uid())),
    (select tenant_id from public.producao_funcionarios where id = coalesce(p_user_id, auth.uid()))
  );
$$;

create or replace function public.current_tenant_has_transportadora(p_user_id uuid default null)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_dev(p_user_id) or exists (
    select 1 from public.tenant_products
    where tenant_id = public.current_tenant_id(p_user_id) and product = 'transportadora' and status = 'active'
  );
$$;

create or replace function public.current_tenant_has_financas(p_user_id uuid default null)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_dev(p_user_id) or exists (
    select 1 from public.tenant_products
    where tenant_id = public.current_tenant_id(p_user_id) and product = 'financas' and status = 'active'
  );
$$;

create or replace function public.current_tenant_has_estoque(p_user_id uuid default null)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_dev(p_user_id) or exists (
    select 1 from public.tenant_products
    where tenant_id = public.current_tenant_id(p_user_id) and product = 'estoque' and status = 'active'
  );
$$;

create or replace function public.current_tenant_has_producao(p_user_id uuid default null)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_dev(p_user_id) or exists (
    select 1 from public.tenant_products
    where tenant_id = public.current_tenant_id(p_user_id) and product = 'producao' and status = 'active'
  );
$$;

create or replace function public.current_tenant_has_producao_actor(p_user_id uuid default null)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_dev(p_user_id) or exists (
    select 1 from public.tenant_products
    where tenant_id = public.current_producao_actor_tenant_id(p_user_id) and product = 'producao' and status = 'active'
  );
$$;

create or replace function public.current_tenant_has_erp(p_user_id uuid default null)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_dev(p_user_id) or exists (
    select 1 from public.tenant_products
    where tenant_id = public.current_tenant_id(p_user_id) and product = 'erp' and status = 'active'
  );
$$;
