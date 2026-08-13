"use client";

import { ListPageTemplate } from "@/components/erp/templates/ListPageTemplate";
import { getMockBankAccounts, type BankAccount } from "@/mocks/erp/bankAccounts";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatCurrency } from "@/lib/utils/currency";
import type { DataTableColumn } from "@/components/erp/tables/DataTable";

const columns: DataTableColumn<BankAccount>[] = [
  { key: "bank", header: "Banco", sortable: true, sortAccessor: (r) => r.bank, render: (r) => <span className="font-medium text-gray-900">{r.bank}</span> },
  { key: "agency", header: "Agência" },
  { key: "account", header: "Conta" },
  { key: "type", header: "Tipo" },
  { key: "balance", header: "Saldo", align: "right", sortable: true, sortAccessor: (r) => r.balance, render: (r) => formatCurrency(r.balance) },
];

export default function BancosPage() {
  const tenantSlug = useTenantSlug();
  const accounts = getMockBankAccounts();

  return (
    <ListPageTemplate<BankAccount>
      tenantSlug={tenantSlug}
      breadcrumb={[{ label: "Financeiro", href: "/erp/financeiro" }, { label: "Bancos" }]}
      title="Bancos"
      description="Contas bancárias e saldos."
      primaryAction={{ label: "Nova conta bancária" }}
      data={accounts}
      columns={columns}
      getRowId={(r) => r.id}
      searchableFields={["bank", "agency", "account"]}
      searchPlaceholder="Buscar por banco, agência ou conta..."
    />
  );
}
