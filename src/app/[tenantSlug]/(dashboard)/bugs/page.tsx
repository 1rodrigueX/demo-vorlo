import { listOwnBugReports } from "@/lib/actions/bug-reports";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BugReportForm } from "@/components/bugs/BugReportForm";
import { cn } from "@/lib/utils/cn";

const SEVERITY_LABEL: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export default async function BugsPage() {
  const bugs = await listOwnBugReports();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Reportar bug</h1>
        <p className="mt-1 text-sm text-gray-500">Encontrou algo quebrado? Conta pra gente.</p>
      </div>

      <Card className="p-6">
        <BugReportForm />
      </Card>

      {bugs.length > 0 && (
        <Card className="divide-y divide-gray-100 overflow-hidden">
          {bugs.map((b) => (
            <div key={b.id} className="space-y-2 px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      b.severity === "critica" || b.severity === "alta"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700",
                    )}
                  >
                    {SEVERITY_LABEL[b.severity]}
                  </Badge>
                  <span className="text-xs text-gray-400">{new Date(b.created_at).toLocaleString("pt-BR")}</span>
                </div>
                <Badge className={cn(b.status === "answered" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                  {b.status === "answered" ? "Respondido" : "Enviado"}
                </Badge>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-800">{b.message}</p>
              {b.response && (
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Resposta do Suporte
                  </p>
                  {b.response}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
