import {
  LayoutDashboard,
  UserRound,
  Truck,
  Package,
  Tags,
  UserCog,
  Users,
  KeyRound,
  ShoppingCart,
  FileText,
  Receipt,
  ClipboardList,
  FileCheck2,
  Barcode,
  Factory,
  ListChecks,
  CalendarClock,
  ClipboardCheck,
  Boxes,
  FileBarChart2,
  Warehouse,
  Package2,
  ArrowLeftRight,
  Building2,
  ShoppingBag,
  FileInput,
  PackageCheck,
  Lightbulb,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Landmark,
  TrendingUp,
  FileStack,
  FileCode,
  FileType,
  Settings2,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

/**
 * Fonte única da navegação do ERP — usada pela sidebar desktop, pelo drawer
 * mobile e pelo breadcrumb (pra resolver o label de cada trecho da URL).
 * hrefs SEM o prefixo `/{tenantSlug}` (quem renderiza prefixa).
 *
 * "Notas fiscais"/"Boletos" (em Vendas) e "Fornecedores" (em Compras)
 * apontam pra rota de OUTRO grupo (Fiscal/Financeiro/Cadastros) de propósito
 * — mesma página, sem duplicar.
 */

export type ErpNavItem = { label: string; href: string; icon: LucideIcon; badge?: string };
export type ErpNavGroup = { id: string; label: string | null; icon: LucideIcon; items: ErpNavItem[] };

export const ERP_DASHBOARD_ITEM: ErpNavItem = { label: "Dashboard", href: "/erp", icon: LayoutDashboard };

export const ERP_NAV_GROUPS: ErpNavGroup[] = [
  {
    id: "cadastros",
    label: "Cadastros",
    icon: Users,
    items: [
      { label: "Clientes", href: "/erp/cadastros/clientes", icon: UserRound },
      { label: "Fornecedores", href: "/erp/cadastros/fornecedores", icon: Truck },
      { label: "Produtos", href: "/erp/cadastros/produtos", icon: Package },
      { label: "Categorias", href: "/erp/cadastros/categorias", icon: Tags },
      { label: "Vendedores", href: "/erp/cadastros/vendedores", icon: UserCog },
      { label: "Funcionários", href: "/erp/cadastros/funcionarios", icon: Users },
      { label: "Usuários", href: "/erp/cadastros/usuarios", icon: KeyRound },
    ],
  },
  {
    id: "vendas",
    label: "Vendas",
    icon: ShoppingCart,
    items: [
      { label: "Propostas comerciais", href: "/erp/vendas/propostas", icon: FileText },
      { label: "Vendas", href: "/erp/vendas", icon: Receipt },
      { label: "Pedidos de venda", href: "/erp/vendas/pedidos", icon: ClipboardList },
      { label: "Notas fiscais", href: "/erp/fiscal", icon: FileCheck2 },
      { label: "Boletos", href: "/erp/financeiro/boletos", icon: Barcode },
    ],
  },
  {
    id: "producao",
    label: "Produção",
    icon: Factory,
    items: [
      { label: "Ordens de produção", href: "/erp/producao", icon: ListChecks },
      { label: "Programação", href: "/erp/producao/programacao", icon: CalendarClock },
      { label: "Apontamentos", href: "/erp/producao/apontamentos", icon: ClipboardCheck },
      { label: "Consumo de matéria-prima", href: "/erp/producao/consumo-materia-prima", icon: Boxes },
      { label: "Relatórios", href: "/erp/producao/relatorios", icon: FileBarChart2 },
    ],
  },
  {
    id: "estoque",
    label: "Estoque",
    icon: Warehouse,
    items: [
      { label: "Estoque", href: "/erp/estoque", icon: Package2 },
      { label: "Movimentações", href: "/erp/estoque/movimentacoes", icon: ArrowLeftRight },
      { label: "Inventário", href: "/erp/estoque/inventario", icon: ClipboardList },
      { label: "Depósitos", href: "/erp/estoque/depositos", icon: Building2 },
    ],
  },
  {
    id: "compras",
    label: "Compras",
    icon: ShoppingBag,
    items: [
      { label: "Pedidos de compra", href: "/erp/compras/pedidos", icon: FileInput },
      { label: "Recebimentos", href: "/erp/compras/recebimentos", icon: PackageCheck },
      { label: "Fornecedores", href: "/erp/cadastros/fornecedores", icon: Truck },
      { label: "Sugestão de compras", href: "/erp/compras/sugestoes", icon: Lightbulb },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    icon: Wallet,
    items: [
      { label: "Contas a receber", href: "/erp/financeiro/receber", icon: ArrowDownCircle },
      { label: "Contas a pagar", href: "/erp/financeiro/pagar", icon: ArrowUpCircle },
      { label: "Caixa", href: "/erp/financeiro/caixa", icon: Landmark },
      { label: "Bancos", href: "/erp/financeiro/bancos", icon: Building2 },
      { label: "Fluxo de caixa", href: "/erp/financeiro/fluxo-caixa", icon: TrendingUp },
    ],
  },
  {
    id: "fiscal",
    label: "Fiscal",
    icon: FileStack,
    items: [
      { label: "NF-e", href: "/erp/fiscal", icon: FileText },
      { label: "XML", href: "/erp/fiscal", icon: FileCode },
      { label: "DANFE", href: "/erp/fiscal", icon: FileType },
      { label: "Configuração fiscal", href: "/erp/fiscal/configuracao", icon: Settings2 },
    ],
  },
];

export const ERP_FOOTER_ITEMS: ErpNavItem[] = [
  { label: "Relatórios", href: "/erp/relatorios", icon: BarChart3 },
  { label: "Configurações", href: "/erp/configuracoes", icon: Settings },
];

/** Todos os itens (pra breadcrumb resolver label a partir do href). */
export function allErpNavItems(): ErpNavItem[] {
  return [
    ERP_DASHBOARD_ITEM,
    ...ERP_NAV_GROUPS.flatMap((g) => g.items),
    ...ERP_FOOTER_ITEMS,
  ];
}
