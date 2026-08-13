"use client";

import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { ACTIVE_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { getMockUsers, type SystemUser } from "@/mocks/erp/users";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatRelative } from "@/lib/utils/dates";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<SystemUser>[] = [
  { key: "name", header: "Usuário", sortable: true, sortAccessor: (r) => r.name, render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
  { key: "email", header: "E-mail" },
  { key: "profile", header: "Perfil de acesso" },
  { key: "lastAccess", header: "Último acesso", render: (r) => formatRelative(r.lastAccess) },
  { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={ACTIVE_STATUS_MAP} /> },
];

export default function UsuariosPage() {
  const tenantSlug = useTenantSlug();
  const users = getMockUsers();

  return (
    <ListPageTemplate<SystemUser>
      tenantSlug={tenantSlug}
      title="Usuários"
      description="Usuários com acesso ao sistema e seus perfis."
      primaryAction={{ label: "Novo usuário" }}
      data={users}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["name", "email", "profile"]}
      searchPlaceholder="Buscar por nome, e-mail ou perfil..."
    />
  );
}
