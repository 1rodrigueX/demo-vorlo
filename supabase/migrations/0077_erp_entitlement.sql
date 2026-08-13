-- ERP como módulo add-on pago, separado (mesmo padrão de Finanças/Estoque/
-- Produção). Diferente desses três, o ERP não tem tabelas de dados reais
-- ainda (fase de mock visual) — esta migration só abre o produto pro
-- catálogo de billing e cria a função de entitlement; as tabelas reais do
-- ERP vêm em uma migration futura, separada.
--
-- Nota: a migration 0060 (profile_product_access, camada de permissão por
-- usuário) existe no repo mas NUNCA foi aplicada no banco real — confirmado
-- por introspecção antes de escrever isto. current_tenant_has_financas() em
-- produção ainda é a versão simples de 0050 (só checa tenant_products), sem
-- current_profile_has_product_access. Esta migration segue o que está
-- REALMENTE em produção, não o que os arquivos de migration mais recentes
-- do repo sugerem.

alter table public.tenant_products drop constraint tenant_products_product_check;
alter table public.tenant_products
  add constraint tenant_products_product_check
  check (product in ('transportadora', 'financas', 'estoque', 'producao', 'erp'));

alter table public.module_pending_checkouts drop constraint module_pending_checkouts_module_check;
alter table public.module_pending_checkouts
  add constraint module_pending_checkouts_module_check
  check (module in ('financas', 'estoque', 'producao', 'erp'));

create or replace function public.current_tenant_has_erp()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_dev() or exists (
    select 1 from public.tenant_products
    where tenant_id = public.current_tenant_id()
      and product = 'erp'
      and status = 'active'
  );
$$;
