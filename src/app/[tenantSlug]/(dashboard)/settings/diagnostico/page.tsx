import { redirect } from "next/navigation";
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/Card";
import { runDiagnostics, type CheckStatus } from "@/lib/actions/diagnostics";

/**
 * Status de cada funcionalidade do CRM. Serve pro dono descobrir sozinho por
 * que algo não funciona, em vez de abrir chamado — quase toda "falha" até
 * aqui foi configuração faltando, não defeito.
 */
export default async function DiagnosticoPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const current = await getCurrentUser();
  if (!current?.profile) redirect(`/${tenantSlug}/dashboard`);

  const result = await runDiagnostics();

  if ("error" in result) {
    return (
      <Card className="p-6 text-sm text-gray-600">
        Não foi possível rodar o diagnóstico: {result.error}
      </Card>
    );
  }

  const problems = result.checks.filter((c) => c.status === "error").length;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Status do sistema</h1>
        <p className="mt-1 text-sm text-gray-500">
          {problems === 0
            ? "Tudo que está configurado está funcionando."
            : `${problems} ${problems === 1 ? "item precisa" : "itens precisam"} da sua atenção.`}
        </p>
      </div>

      <Card className="divide-y divide-gray-100">
        {result.checks.map((check) => (
          <div key={check.id} className="flex items-start gap-3 px-5 py-4">
            <StatusIcon status={check.status} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">{check.label}</p>
              <p className="mt-0.5 text-sm text-gray-600">{check.detail}</p>
              {check.action && <p className="mt-1 text-xs text-gray-400">{check.action}</p>}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function StatusIcon({ status }: { status: CheckStatus }) {
  const shared = "mt-0.5 shrink-0";
  if (status === "ok") return <CheckCircle2 size={17} className={`${shared} text-emerald-500`} />;
  if (status === "warn") return <AlertTriangle size={17} className={`${shared} text-amber-500`} />;
  if (status === "error") return <XCircle size={17} className={`${shared} text-red-500`} />;
  return <MinusCircle size={17} className={`${shared} text-gray-300`} />;
}
