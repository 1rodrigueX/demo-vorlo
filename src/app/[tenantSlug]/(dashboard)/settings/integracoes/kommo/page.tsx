import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/Card";
import { KommoImportWizard, type RunningImport } from "@/components/settings/KommoImportWizard";
import { loadKommoPreview } from "@/lib/actions/kommo";

/**
 * Tela de importação do Kommo. O mapeamento de etapas e responsáveis é lido do
 * Kommo na hora (loadKommoPreview) — se o cliente mexeu no funil de lá, aparece
 * atualizado sem precisar reconectar.
 */
export default async function KommoImportPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  const current = await getCurrentUser();
  if (!current?.profile) redirect(`/${tenantSlug}/dashboard`);

  const supabase = await createClient();
  const [preview, { data: stages }, { data: members }, { data: lastImport }] = await Promise.all([
    loadKommoPreview(),
    supabase
      .from("pipeline_stages")
      .select("id, name")
      .eq("tenant_id", current.profile.tenant_id)
      .order("position"),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("tenant_id", current.profile.tenant_id)
      .order("full_name"),
    supabase
      .from("kommo_imports")
      .select("id, status, cursor, stats, error, started_at, finished_at")
      .eq("tenant_id", current.profile.tenant_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const running: RunningImport | null = lastImport
    ? {
        id: lastImport.id,
        status: lastImport.status,
        cursor: lastImport.cursor as { entity?: string; page?: number } | null,
        stats: lastImport.stats as Record<string, number> | null,
        error: lastImport.error,
        startedAt: lastImport.started_at,
        finishedAt: lastImport.finished_at,
      }
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/${tenantSlug}/settings/integracoes`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={14} />
          Integrações
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Importar do Kommo</h1>
        <p className="mt-1 text-sm text-gray-500">
          Contatos com telefone já cadastrado aqui são reaproveitados, não duplicados. Reimportar atualiza o
          que já veio em vez de criar de novo.
        </p>
      </div>

      {"error" in preview ? (
        <Card className="flex items-start gap-3 p-5">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-medium text-gray-900">Não foi possível ler os dados do Kommo</p>
            <p className="mt-0.5 text-sm text-gray-600">{preview.error}</p>
            <Link
              href={`/${tenantSlug}/settings/integracoes`}
              className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:underline"
            >
              Revisar a conexão
            </Link>
          </div>
        </Card>
      ) : (
        <KommoImportWizard
          preview={preview}
          stages={stages ?? []}
          members={(members ?? []).map((m) => ({ id: m.id, name: m.full_name ?? "Sem nome" }))}
          running={running}
        />
      )}
    </div>
  );
}
