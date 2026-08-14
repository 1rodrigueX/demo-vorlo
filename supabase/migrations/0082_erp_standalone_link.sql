-- ERP como produto standalone (sem CRM) + vínculo manual (via suporte, painel
-- /dev) entre um tenant CRM e um tenant ERP-only comprados separadamente.
--
-- 1) module_pending_checkouts precisa aceitar tenant_id nulo + company_name,
--    mesmo padrão que transportadora_pending_checkouts já tem (0044) — só o
--    ERP vai de fato usar esse caminho (financas/estoque/producao continuam
--    exigindo tenant existente, decisão fica na camada de aplicação).
alter table public.module_pending_checkouts alter column tenant_id drop not null;
alter table public.module_pending_checkouts add column company_name text;
alter table public.module_pending_checkouts
  add constraint module_pending_checkouts_target_chk
  check (tenant_id is not null or company_name is not null);

-- 2) Rastreabilidade do vínculo — nunca usada em query de dado de negócio,
--    só pra suporte saber de onde veio a concessão gratuita de ERP.
alter table public.tenants
  add column linked_tenant_id uuid references public.tenants (id) on delete set null;
