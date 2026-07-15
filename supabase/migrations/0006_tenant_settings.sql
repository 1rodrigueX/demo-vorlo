-- Permite que o dono/gestor do tenant edite a própria empresa (nome, cor da
-- marca, posição do botão do assistente) direto pelo CRM, sem precisar do dev.
create policy "tenants_update_own_admin"
  on public.tenants for update to authenticated
  using (id = public.current_tenant_id() and public.is_admin())
  with check (id = public.current_tenant_id());
