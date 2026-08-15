import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/erp/tables/DataTable";
import { StatCard, type StatCardTone } from "@/components/erp/cards/StatCard";
import { ErpBreadcrumb, type BreadcrumbItem } from "@/components/erp/layout/ErpBreadcrumb";

type PrimaryAction = { label: string; href?: string; onClick?: () => void; icon?: LucideIcon };
type StatCardDef = { label: string; value: string | number; icon?: LucideIcon; tone?: StatCardTone };

/**
 * Composição padrão de uma página de lista: breadcrumb + título/descrição +
 * ação principal + StatCards opcionais + DataTable. É o que a maioria das
 * ~20 páginas de lista do ERP usa (Cadastros, Compras, Estoque/Produção não-dashboard).
 */
export function ListPageTemplate<T>({
  tenantSlug,
  breadcrumb,
  title,
  description,
  primaryAction,
  headerActions,
  statCards,
  data,
  columns,
  getRowId,
  searchableFields,
  searchPlaceholder,
  filtersSlot,
  pageSize,
  selectable,
  onSelectionChange,
  rowActions,
  onRowClick,
  isLoading,
  emptyState,
}: {
  tenantSlug: string;
  breadcrumb?: BreadcrumbItem[];
  title: string;
  description?: string;
  primaryAction?: PrimaryAction;
  /** Ações extras ao lado do botão principal (ex.: "Importar com IA"). */
  headerActions?: ReactNode;
  statCards?: StatCardDef[];
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  searchableFields?: (keyof T)[];
  searchPlaceholder?: string;
  filtersSlot?: ReactNode;
  pageSize?: number;
  selectable?: boolean;
  onSelectionChange?: (ids: string[]) => void;
  rowActions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyState?: ReactNode;
}) {
  return (
    <div className="space-y-5">
      {breadcrumb && <ErpBreadcrumb items={breadcrumb} tenantSlug={tenantSlug} />}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerActions}
          {primaryAction &&
          (primaryAction.href ? (
            <Link href={primaryAction.href}>
              <Button type="button">
                {primaryAction.icon ? <primaryAction.icon size={16} /> : <Plus size={16} />}
                {primaryAction.label}
              </Button>
            </Link>
          ) : (
            <Button type="button" onClick={primaryAction.onClick}>
              {primaryAction.icon ? <primaryAction.icon size={16} /> : <Plus size={16} />}
              {primaryAction.label}
            </Button>
          ))}
        </div>
      </div>

      {statCards && statCards.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {statCards.map((c) => (
            <StatCard key={c.label} label={c.label} value={c.value} icon={c.icon} tone={c.tone} />
          ))}
        </div>
      )}

      <DataTable<T>
        data={data}
        columns={columns}
        getRowId={getRowId}
        searchableFields={searchableFields}
        searchPlaceholder={searchPlaceholder}
        filtersSlot={filtersSlot}
        pageSize={pageSize}
        selectable={selectable}
        onSelectionChange={onSelectionChange}
        rowActions={rowActions}
        onRowClick={onRowClick}
        isLoading={isLoading}
        emptyState={emptyState}
      />
    </div>
  );
}
