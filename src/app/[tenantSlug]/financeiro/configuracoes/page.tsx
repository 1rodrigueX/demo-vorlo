import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCategorias } from "@/lib/actions/financas-categorias";
import { CategoriasManager } from "@/components/financas/CategoriasManager";

export default async function FinanceiroConfiguracoesPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: hasAccess } = await supabase.rpc("current_tenant_has_financas");
  if (!hasAccess) redirect("/comprar-financas");

  const categorias = await getCategorias();

  return (
    <div className="min-h-screen px-6 py-6" style={{ background: "#0d0d0d", color: "#ffffff" }}>
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/${tenantSlug}/financeiro`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#898781] hover:text-white"
        >
          <ArrowLeft size={14} />
          Voltar pro dashboard
        </Link>
        <h1 className="text-xl font-semibold text-white">Configurações — Categorias</h1>
        <p className="mt-1 text-sm text-[#898781]">Crie categorias próprias além das padrão.</p>

        <div className="mt-6">
          <CategoriasManager categorias={categorias} />
        </div>
      </div>
    </div>
  );
}
