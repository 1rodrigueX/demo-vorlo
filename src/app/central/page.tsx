import { redirect } from "next/navigation";
import Link from "next/link";
import { Home } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAccountServices } from "@/lib/auth/current-user";
import { UserMenu } from "@/components/layout/UserMenu";
import { CentralServices } from "@/components/central/CentralServices";
import { SynexaMark } from "@/components/brand/SynexaLogo";

export default async function CentralPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { services, ownerName } = await getAccountServices();
  const email = user.email ?? "";
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <header className="mx-auto flex max-w-4xl items-center justify-between pb-10">
        <Link href="/" className="flex items-center gap-2" aria-label="Voltar ao site Synexa">
          <SynexaMark size={22} withCircuit={false} />
          <span className="text-sm font-semibold text-gray-900">Synexa</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden items-center gap-1.5 rounded-lg border border-gray-300 bg-panel px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 sm:inline-flex"
          >
            <Home size={14} />
            Voltar ao site
          </Link>
          <UserMenu name={ownerName || email || "Usuário"} email={email} role={profile?.role} />
        </div>
      </header>

      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {ownerName ? `Olá, ${ownerName.split(" ")[0]}!` : "Sua central"}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Acesse o que você já tem em <span className="font-medium text-gray-700">Meus acessos</span> ou assine
            novos em <span className="font-medium text-gray-700">Produtos</span>.
          </p>
        </div>

        <div className="mt-8">
          <CentralServices services={services} />
        </div>

        <p className="mt-10 text-center text-sm text-gray-400">
          <Link href="/central/seguranca" className="hover:text-gray-600 hover:underline">
            Segurança da conta
          </Link>
        </p>
      </div>
    </div>
  );
}
