"use client";

import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { formatShortDate } from "@/components/erp/lib/format";
import type { Profile } from "@/types/domain";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const ROLE_LABEL: Record<Profile["role"], string> = {
  owner: "Dono",
  manager: "Gerente",
  member: "Membro",
};

/**
 * Vendedores e Usuários do ERP são a mesma tabela profiles do CRM — sem
 * distinção real entre os dois hoje, então os dois usam esta mesma tabela,
 * só mudando título/descrição. Somente leitura: gestão de conta é do CRM.
 */
export function ProfilesTable({
  tenantSlug,
  title,
  description,
  initialProfiles,
}: {
  tenantSlug: string;
  title: string;
  description: string;
  initialProfiles: Profile[];
}) {
  const columns: DataTableColumn<Profile>[] = [
    {
      key: "full_name",
      header: "Nome",
      sortable: true,
      sortAccessor: (r) => r.full_name ?? "",
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
          <span className="font-medium text-gray-900">{r.full_name ?? "—"}</span>
        </div>
      ),
    },
    { key: "role", header: "Papel", render: (r) => ROLE_LABEL[r.role] },
    { key: "created_at", header: "Na equipe desde", render: (r) => formatShortDate(r.created_at) },
  ];

  return (
    <ListPageTemplate<Profile>
      tenantSlug={tenantSlug}
      title={title}
      description={description}
      data={initialProfiles}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["full_name"]}
      searchPlaceholder="Buscar por nome..."
    />
  );
}
