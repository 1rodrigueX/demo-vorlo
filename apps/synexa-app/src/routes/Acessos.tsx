import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Truck, Wallet, Boxes, Factory, LogOut, ArrowRight, type LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { SynexaMark } from "@/components/SynexaMark";

type Service = { key: string; name: string; desc: string; active: boolean; icon: LucideIcon; route?: string };

export function Acessos() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const uid = session?.user.id;
      const [{ data: profile }, tr, fi, es, pr] = await Promise.all([
        supabase.from("profiles").select("tenant_id, full_name").eq("id", uid ?? "").maybeSingle(),
        supabase.rpc("current_tenant_has_transportadora"),
        supabase.rpc("current_tenant_has_financas"),
        supabase.rpc("current_tenant_has_estoque"),
        supabase.rpc("current_tenant_has_producao"),
      ]);

      let crmActive = false;
      if (profile?.tenant_id) {
        const { data: tenant } = await supabase
          .from("tenants")
          .select("billing_plan_id")
          .eq("id", profile.tenant_id)
          .maybeSingle();
        crmActive = !!tenant?.billing_plan_id;
      }

      if (!alive) return;
      setName(profile?.full_name || session?.user.email || "");
      setServices([
        { key: "crm", name: "CRM", desc: "Clientes, vendas e atendimento com IA.", active: crmActive, icon: LayoutDashboard, route: "/crm" },
        { key: "transportadora", name: "Transportadora", desc: "Fretes, clientes e motoristas.", active: !!tr.data, icon: Truck },
        { key: "financas", name: "Finanças", desc: "Fluxo de caixa, contas e boletos.", active: !!fi.data, icon: Wallet },
        { key: "estoque", name: "Estoque", desc: "Itens, entradas e saídas.", active: !!es.data, icon: Boxes },
        { key: "producao", name: "Produção", desc: "Turnos, máquinas e apontamento.", active: !!pr.data, icon: Factory },
      ]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [session]);

  const firstName = name.split(" ")[0];

  return (
    <div className="min-h-full bg-carbon-900">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <span className="text-ignite">
            <SynexaMark size={22} />
          </span>
          <span className="text-sm font-semibold tracking-tight text-white-soft">Synexa</span>
        </div>
        <button
          onClick={() => void signOut()}
          className="inline-flex items-center gap-2 rounded-lg border border-carbon-700 px-3 py-1.5 text-sm text-grey transition-colors hover:bg-carbon-800 hover:text-white-soft"
        >
          <LogOut size={15} />
          Sair
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-20">
        <div className="mt-6 mb-9">
          <h1 className="text-2xl font-bold tracking-tight text-white-soft">
            {firstName ? `Olá, ${firstName}` : "Seus acessos"}
          </h1>
          <p className="mt-1.5 text-sm text-grey">Escolha um serviço para começar.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl border border-carbon-700 bg-carbon-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <ServiceCard key={s.key} service={s} onOpen={s.route ? () => navigate(s.route!) : undefined} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ServiceCard({ service, onOpen }: { service: Service; onOpen?: () => void }) {
  const Icon = service.icon;
  const openable = service.active && !!onOpen;
  return (
    <button
      disabled={!service.active}
      onClick={openable ? onOpen : undefined}
      className={`group flex flex-col rounded-2xl border p-5 text-left transition-all ${
        service.active
          ? "cursor-pointer border-carbon-700 bg-carbon-800 hover:-translate-y-0.5 hover:border-ignite/40"
          : "cursor-default border-carbon-700/60 bg-carbon-850 opacity-60"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`grid h-11 w-11 place-items-center rounded-xl ${
            service.active ? "bg-ignite/10 text-ignite" : "bg-carbon-700 text-grey-dim"
          }`}
        >
          <Icon size={22} strokeWidth={1.9} />
        </span>
        {service.active ? (
          <ArrowRight size={18} className="text-grey-dim transition-transform group-hover:translate-x-0.5 group-hover:text-ignite" />
        ) : (
          <span className="rounded-full border border-carbon-600 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-grey-dim">
            Inativo
          </span>
        )}
      </div>
      <h2 className="mt-4 text-base font-semibold text-white-soft">{service.name}</h2>
      <p className="mt-1 text-[13px] leading-snug text-grey">{service.desc}</p>
    </button>
  );
}
