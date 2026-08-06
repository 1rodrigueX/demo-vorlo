"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { startKommoImport, cancelKommoImport } from "@/lib/actions/kommo";
import type { KommoPreview } from "@/lib/actions/kommo";

export type RunningImport = {
  id: string;
  status: string;
  cursor: { entity?: string; page?: number } | null;
  stats: Record<string, number> | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
};

const ENTITY_LABELS: Record<string, string> = {
  users: "responsáveis",
  pipelines: "funis e etapas",
  contact_fields: "campos de contato",
  lead_fields: "campos de negócio",
  companies: "empresas",
  contacts: "contatos",
  leads: "negócios",
};

const STAT_LABELS: Record<string, string> = {
  usersMapped: "responsáveis mapeados",
  stagesCreated: "etapas criadas",
  customFieldsImported: "campos personalizados",
  companiesCreated: "empresas criadas",
  companiesUpdated: "empresas atualizadas",
  contactsCreated: "contatos criados",
  contactsUpdated: "contatos atualizados",
  contactsMatched: "contatos já existentes reaproveitados",
  dealsCreated: "negócios criados",
  dealsUpdated: "negócios atualizados",
  dealsSkipped: "negócios pulados (sem contato ou etapa)",
};

export function KommoImportWizard({
  preview,
  stages,
  members,
  running,
}: {
  preview: KommoPreview;
  stages: { id: string; name: string }[];
  members: { id: string; name: string }[];
  running: RunningImport | null;
}) {
  const [stageMap, setStageMap] = useState<Record<string, string>>({});
  const [ownerMap, setOwnerMap] = useState<Record<string, string>>({});
  const [defaultOwnerId, setDefaultOwnerId] = useState(members[0]?.id ?? "");
  const [defaultStageId, setDefaultStageId] = useState(stages[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isRunning = running?.status === "pending" || running?.status === "running";

  // Enquanto roda, quem avança é o cron — a tela só busca o progresso.
  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(timer);
  }, [isRunning, router]);

  function handleStart() {
    startTransition(async () => {
      const result = await startKommoImport({
        stageMap,
        ownerMap,
        defaultOwnerId,
        defaultStageId: defaultStageId || undefined,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Importação iniciada");
      router.refresh();
    });
  }

  function handleCancel() {
    if (!running) return;
    startTransition(async () => {
      const result = await cancelKommoImport(running.id);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Importação cancelada");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {running && <ImportStatusCard running={running} onCancel={handleCancel} isPending={isPending} />}

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-gray-900">Responsável padrão</h2>
        <p className="mb-3 mt-1 text-xs text-gray-500">
          Usado quando o responsável do Kommo não tem um vendedor equivalente aqui.
        </p>
        <select
          value={defaultOwnerId}
          onChange={(e) => setDefaultOwnerId(e.target.value)}
          disabled={isRunning}
          className="w-full max-w-sm rounded-md border border-gray-300 bg-panel px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>

        {preview.users.length > 0 && (
          <div className="mt-4 space-y-2">
            <Label>Responsáveis do Kommo</Label>
            {preview.users.map((user) => (
              <div key={user.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="min-w-40 text-gray-600">{user.name}</span>
                <span className="text-gray-300">→</span>
                <select
                  value={ownerMap[user.id] ?? ""}
                  onChange={(e) => setOwnerMap({ ...ownerMap, [user.id]: e.target.value })}
                  disabled={isRunning}
                  className="rounded-md border border-gray-300 bg-panel px-2 py-1 text-sm text-gray-700"
                >
                  <option value="">Detectar pelo nome/e-mail</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-gray-900">Etapas do funil</h2>
        <p className="mb-3 mt-1 text-xs text-gray-500">
          Onde cada etapa do Kommo cai no seu funil. O que ficar em &quot;criar etapa&quot; vira uma coluna
          nova no fim do seu pipeline — nenhum lead se perde.
        </p>

        <div className="space-y-2">
          {preview.stages.map((stage) => (
            <div key={stage.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-52 text-gray-600">
                {stage.name}
                <span className="ml-1 text-xs text-gray-400">({stage.pipelineName})</span>
              </span>
              <span className="text-gray-300">→</span>
              <select
                value={stageMap[stage.id] ?? ""}
                onChange={(e) => setStageMap({ ...stageMap, [stage.id]: e.target.value })}
                disabled={isRunning}
                className="rounded-md border border-gray-300 bg-panel px-2 py-1 text-sm text-gray-700"
              >
                <option value="">Criar etapa com esse nome</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {stages.length > 0 && (
          <div className="mt-4">
            <Label htmlFor="defaultStage">Etapa padrão</Label>
            <select
              id="defaultStage"
              value={defaultStageId}
              onChange={(e) => setDefaultStageId(e.target.value)}
              disabled={isRunning}
              className="w-full max-w-sm rounded-md border border-gray-300 bg-panel px-3 py-2 text-sm text-gray-700"
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Para negócios cuja etapa do Kommo não foi encontrada.
            </p>
          </div>
        )}
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleStart} isLoading={isPending} disabled={isRunning || !defaultOwnerId}>
          <Download size={15} />
          {isRunning ? "Importação em andamento" : "Iniciar importação"}
        </Button>
        <p className="text-xs text-gray-500">
          Roda em segundo plano. Pode fechar esta tela — a importação continua.
        </p>
      </div>
    </div>
  );
}

function ImportStatusCard({
  running,
  onCancel,
  isPending,
}: {
  running: RunningImport;
  onCancel: () => void;
  isPending: boolean;
}) {
  const isActive = running.status === "pending" || running.status === "running";
  const stats = Object.entries(running.stats ?? {}).filter(([, value]) => value > 0);

  const tone =
    running.status === "done"
      ? "border-emerald-200 bg-emerald-50/60"
      : running.status === "failed"
        ? "border-red-200 bg-red-50/60"
        : "border-indigo-200 bg-indigo-50/50";

  return (
    <Card className={`border p-5 ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {running.status === "done"
              ? "Importação concluída"
              : running.status === "failed"
                ? "Importação falhou"
                : running.status === "canceled"
                  ? "Importação cancelada"
                  : "Importando..."}
          </p>
          {isActive && running.cursor?.entity && (
            <p className="mt-0.5 text-xs text-gray-600">
              Trazendo {ENTITY_LABELS[running.cursor.entity] ?? running.cursor.entity}
              {running.cursor.page ? ` · página ${running.cursor.page}` : ""}
            </p>
          )}
        </div>
        {isActive && (
          <Button variant="secondary" size="sm" onClick={onCancel} isLoading={isPending}>
            <XCircle size={14} />
            Cancelar
          </Button>
        )}
      </div>

      {running.error && <p className="mt-2 text-sm text-red-700">{running.error}</p>}

      {stats.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
          {stats.map(([key, value]) => (
            <div key={key} className="text-xs">
              <dt className="text-gray-500">{STAT_LABELS[key] ?? key}</dt>
              <dd className="font-semibold text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}
