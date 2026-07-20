import { redirect } from "next/navigation";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolveHomeRoute } from "@/lib/auth/current-user";
import { Button } from "@/components/ui/Button";

/**
 * Placeholder — o Controle de Finanças ainda não tem checkout de verdade
 * (só é criado direto pelo painel dev por enquanto). Existe pra o card em
 * /central ter destino em vez de link morto.
 */
export default async function ComprarFinancasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const laterHref = await resolveHomeRoute();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-panel p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Wallet size={28} />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Controle de Finanças</h1>
        <p className="mt-2 text-sm text-gray-600">
          Esse produto ainda está em preparação — em breve você poderá assinar por aqui.
        </p>
        <Link href={laterHref}>
          <Button variant="secondary" className="mt-6 w-full">
            Voltar
          </Button>
        </Link>
      </div>
    </div>
  );
}
