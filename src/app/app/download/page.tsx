import { redirect } from "next/navigation";
import { Download, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";

/** Gate de acesso pro download do APK — mesma checagem que o RLS do app usa (current_tenant_has_transportadora). */
export default async function AppDownloadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: hasAccess } = await supabase.rpc("current_tenant_has_transportadora");
  if (!hasAccess) redirect("/comprar-transportadora");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-panel p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <Download size={28} />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Use o Vorlo Transportadora</h1>
        <p className="mt-2 text-sm text-gray-600">
          Entre com o mesmo e-mail e senha (ou Google) que você usa aqui no site.
        </p>

        <a href="/downloads/frete-app-latest.apk" download>
          <Button className="mt-6 w-full">Baixar APK (Android)</Button>
        </a>
        <p className="mt-3 text-xs text-gray-400">
          O Android pode avisar que o app é de &quot;fonte desconhecida&quot; — isso é normal fora da Play Store,
          é só confirmar a instalação.
        </p>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">ou</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /app-web/index.html é o
            build estático do Flutter (public/app-web/), fora do app router; <Link/> tentaria
            navegação client-side pra uma rota que o Next não conhece. */}
        <a href="/app-web/index.html">
          <Button variant="secondary" className="w-full">
            <Globe size={16} />
            Usar direto no navegador
          </Button>
        </a>
        <p className="mt-3 text-xs text-gray-400">
          Sem instalar nada — funciona em qualquer aparelho (computador, celular, tablet).
        </p>
      </div>
    </div>
  );
}
