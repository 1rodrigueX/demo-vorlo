import { redirect } from "next/navigation";
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/Card";
import {
  runDiagnostics,
  getPlatformStatus,
  type CheckStatus,
  type DiagnosticCheck,
  type PlatformOverall,
} from "@/lib/actions/diagnostics";

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

  const [platform, result] = await Promise.all([getPlatformStatus(), runDiagnostics()]);

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
          O primeiro bloco é o CRM em si (se está no ar e as APIs respondendo). O segundo é a sua conta.
        </p>
      </div>

      {!("error" in platform) && (
        <section className="mb-8">
          <PlatformBanner overall={platform.overall} checkedAt={platform.checkedAt} />
          <Card className="mt-3 divide-y divide-gray-100">
            {platform.checks.map((check) => (
              <CheckRow key={check.id} check={check} />
            ))}
          </Card>
        </section>
      )}

      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Status da sua conta</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          {problems === 0
            ? "Tudo que está configurado está funcionando."
            : `${problems} ${problems === 1 ? "item precisa" : "itens precisam"} da sua atenção.`}
        </p>
      </div>

      <Card className="divide-y divide-gray-100">
        {result.checks.map((check) => (
          <CheckRow key={check.id} check={check} />
        ))}
      </Card>
    </div>
  );
}

function CheckRow({ check }: { check: DiagnosticCheck }) {
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <StatusIcon status={check.status} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{check.label}</p>
        <p className="mt-0.5 text-sm text-gray-600">{check.detail}</p>
        {check.action && <p className="mt-1 text-xs text-gray-400">{check.action}</p>}
      </div>
    </div>
  );
}

const PLATFORM_BANNER: Record<PlatformOverall, { text: string; dot: string; box: string }> = {
  operational: {
    text: "CRM operante — todos os serviços no ar",
    dot: "bg-emerald-500",
    box: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  degraded: {
    text: "CRM no ar, com instabilidade em algum serviço",
    dot: "bg-amber-500",
    box: "border-amber-200 bg-amber-50 text-amber-800",
  },
  down: {
    text: "CRM com falha — um serviço essencial está fora",
    dot: "bg-red-500",
    box: "border-red-200 bg-red-50 text-red-800",
  },
};

function PlatformBanner({ overall, checkedAt }: { overall: PlatformOverall; checkedAt: string }) {
  const banner = PLATFORM_BANNER[overall];
  const time = new Date(checkedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${banner.box}`}>
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {overall !== "down" && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${banner.dot}`} />
        )}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${banner.dot}`} />
      </span>
      <p className="flex-1 text-sm font-medium">{banner.text}</p>
      <span className="shrink-0 text-xs opacity-70">verificado {time}</span>
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
