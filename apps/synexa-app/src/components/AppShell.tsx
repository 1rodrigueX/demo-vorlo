import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  KanbanSquare,
  Building2,
  Users,
  MessageCircle,
  Mail,
  Workflow,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { SynexaMark } from "@/components/SynexaMark";
import { LiteToggle } from "@/components/LiteToggle";
import { useAuth } from "@/lib/auth";

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/crm/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/crm/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/crm/companies", label: "Empresas", icon: Building2 },
  { to: "/crm/contacts", label: "Contatos", icon: Users },
  { to: "/crm/leads", label: "Leads", icon: MessageCircle },
  { to: "/crm/emails", label: "E-mails", icon: Mail },
  { to: "/crm/trajetorias", label: "Trajetórias", icon: Workflow },
];

export function AppShell() {
  const { signOut } = useAuth();

  return (
    <div className="flex h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-carbon-800 bg-carbon-950">
        <div className="flex h-14 items-center gap-2.5 px-4">
          <span className="text-ignite">
            <SynexaMark size={20} />
          </span>
          <span className="text-sm font-semibold tracking-tight text-white-soft">Synexa</span>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-ignite/[0.12] text-ignite" : "text-grey hover:bg-carbon-800 hover:text-white-soft"
                }`
              }
            >
              <item.icon size={18} strokeWidth={1.9} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-carbon-800 px-5">
          <span className="text-sm font-semibold text-white-soft">CRM</span>
          <div className="flex items-center gap-2">
            <LiteToggle />
            <button
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-carbon-700 px-2.5 py-1.5 text-xs text-grey transition-colors hover:bg-carbon-800 hover:text-white-soft"
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
