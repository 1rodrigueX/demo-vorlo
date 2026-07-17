import { listOwnSuggestions } from "@/lib/actions/suggestions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SuggestionForm } from "@/components/suggestions/SuggestionForm";
import { cn } from "@/lib/utils/cn";

export default async function SugestoesPage() {
  const suggestions = await listOwnSuggestions();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Sugestões</h1>
        <p className="mt-1 text-sm text-gray-500">Mande ideias ou pedidos de melhoria pro time do FALA AI.</p>
      </div>

      <Card className="p-6">
        <SuggestionForm />
      </Card>

      {suggestions.length > 0 && (
        <Card className="divide-y divide-gray-100 overflow-hidden">
          {suggestions.map((s) => (
            <div key={s.id} className="space-y-2 px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-400">{new Date(s.created_at).toLocaleString("pt-BR")}</span>
                <Badge className={cn(s.status === "answered" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                  {s.status === "answered" ? "Respondida" : "Enviada"}
                </Badge>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-800">{s.message}</p>
              {s.response && (
                <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Resposta do Suporte
                  </p>
                  {s.response}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
