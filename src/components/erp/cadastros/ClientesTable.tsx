"use client";

import Link from "next/link";
import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { StatusBadge } from "@/components/erp/badges/StatusBadge";
import { ACTIVE_STATUS_MAP } from "@/components/erp/badges/statusMaps";
import { formatDocument } from "@/components/erp/lib/format";
import type { ErpCliente } from "@/lib/actions/erp-clientes";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

/**
 * Somente leitura — são os mesmos contatos reais do CRM. Criar/editar
 * acontece na tela de verdade (linka pra lá), não duplicamos o formulário
 * completo (endereço, empresa vinculada, sync com Bling, automações) aqui.
 */
export function ClientesTable({ tenantSlug, initialClientes }: { tenantSlug: string; initialClientes: ErpCliente[] }) {
  const columns: DataTableColumn<ErpCliente>[] = [
    {
      key: "name",
      header: "Cliente",
      sortable: true,
      sortAccessor: (r) => r.name,
      render: (r) => (
        <Link href={`/${tenantSlug}/contacts/${r.id}`} className="block hover:underline">
          <p className="font-medium text-[#ff5722]">{r.name}</p>
          <p className="text-xs text-gray-400">{r.cpf_cnpj ? formatDocument(r.cpf_cnpj) : "—"}</p>
        </Link>
      ),
    },
    { key: "address_city", header: "Cidade", render: (r) => (r.address_city ? `${r.address_city}/${r.address_state ?? ""}` : "—") },
    { key: "email", header: "E-mail", render: (r) => r.email ?? "—" },
    { key: "phone", header: "Telefone", render: (r) => r.phone ?? "—" },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} map={ACTIVE_STATUS_MAP} /> },
  ];

  return (
    <ListPageTemplate<ErpCliente>
      tenantSlug={tenantSlug}
      title="Clientes"
      description="Cadastro de clientes da sua empresa — mesmos contatos do CRM."
      primaryAction={{ label: "Novo cliente", href: `/${tenantSlug}/contacts` }}
      data={initialClientes}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["name", "cpf_cnpj", "email", "address_city"]}
      searchPlaceholder="Buscar por nome, documento, e-mail ou cidade..."
    />
  );
}
