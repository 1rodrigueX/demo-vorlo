import { redirect } from "next/navigation";
import Link from "next/link";
import { Home } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccountServices } from "@/lib/auth/current-user";
import { UserMenu } from "@/components/layout/UserMenu";
import { LiteToggle } from "@/components/layout/LiteToggle";
import { CentralServices } from "@/components/central/CentralServices";
import { AppUpdateCard } from "@/components/central/AppUpdateCard";
import { VorloMark } from "@/components/brand/VorloLogo";

export default async function CentralPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { services, ownerName } = await getAccountServices();
  const email = user.email ?? "";
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

  // O botão de baixar serve o MESMO arquivo que o updater instala: uma fonte
  // de verdade só. Sem isso o link ficaria preso num nome fixo
  // ("Vorlo-Setup.exe") e daria 404 a cada release, porque o instalador sai
  // com a versão no nome (Vorlo_0.2.0_x64-setup.exe).
  //
  // Via admin client porque app_releases é legível só por dev (0075). A URL em
  // si não é segredo — já vai pública no manifesto de /api/app/update —, então
  // o que se lê aqui é o mesmo que qualquer um obteria naquela rota.
  const { data: release } = await createAdminClient()
    .from("app_releases")
    .select("url")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const downloadUrl = release?.url ?? "/downloads/Vorlo-Setup.exe";

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <header className="mx-auto flex max-w-4xl items-center justify-between pb-10">
        <Link href="/" className="flex items-center gap-2" aria-label="Voltar ao site Vorlo">
          <VorloMark size={22} withCircuit={false} />
          <span className="text-sm font-semibold text-gray-900">Vorlo</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden items-center gap-1.5 rounded-lg border border-gray-300 bg-panel px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 sm:inline-flex"
          >
            <Home size={14} />
            Voltar ao site
          </Link>
          <LiteToggle />
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

        {/* No navegador vira "baixar o app"; dentro do app, "atualizar". */}
        <AppUpdateCard downloadUrl={downloadUrl} />

        <p className="mt-10 text-center text-sm text-gray-400">
          <Link href="/central/seguranca" className="hover:text-gray-600 hover:underline">
            Segurança da conta
          </Link>
        </p>
      </div>
    </div>
  );
}
