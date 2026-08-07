import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * O que mudou em cada versão. Aberta de propósito: o app desktop abre esta
 * página na aba Atualizações, e ela também serve pra quem usa pelo navegador.
 *
 * Sai de app_releases (as versões do app) porque é a mesma lista que alimenta
 * o updater — publicou lá, aparece aqui, sem cadastrar duas vezes.
 */
export const dynamic = "force-dynamic";

export default async function NovidadesPage() {
  // Via admin client: app_releases só é legível por dev (0075), e esta página
  // é pública. O conteúdo já é público de qualquer forma — as mesmas notas vão
  // no manifesto de /api/app/update.
  const { data: releases } = await createAdminClient()
    .from("app_releases")
    .select("id, version, notes, published_at, is_published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(30);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/central"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={14} />
          Voltar
        </Link>

        <h1 className="text-2xl font-bold text-gray-900">Novidades</h1>
        <p className="mt-1 text-sm text-gray-500">O que mudou em cada versão da Synexa.</p>

        {!releases?.length ? (
          <div className="mt-8 rounded-xl border border-gray-200 bg-panel p-10 text-center">
            <Sparkles size={20} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">Ainda não há novidades publicadas.</p>
          </div>
        ) : (
          <ol className="mt-8 space-y-4">
            {releases.map((release) => (
              <li key={release.id} className="rounded-xl border border-gray-200 bg-panel p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-gray-900">Versão {release.version}</h2>
                  {release.is_published && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      atual
                    </span>
                  )}
                  {release.published_at && (
                    <span className="text-xs text-gray-400">
                      {new Date(release.published_at).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-600">
                  {release.notes?.trim() || "Melhorias internas e correções."}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}
