"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { checkProvisioningStatus } from "@/lib/actions/checkout";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 20000;

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const { ready } = await checkProvisioningStatus();
      if (cancelled) return;

      if (ready) {
        router.replace("/dashboard");
        return;
      }

      if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) {
        setTimedOut(true);
        return;
      }

      setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-panel p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Pagamento confirmado!</h1>

        {timedOut ? (
          <>
            <p className="mt-2 text-sm text-gray-600">
              Está demorando mais que o esperado pra liberar seu CRM. Isso pode acontecer em raros casos — atualize
              a página em alguns instantes.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Atualizar página
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 flex items-center justify-center gap-2 text-sm text-gray-600">
              <Loader2 size={16} className="animate-spin" />
              Preparando seu CRM, só um instante...
            </p>
            <p className="mt-1 text-xs text-gray-400">Você vai ser levado pro painel assim que estiver pronto.</p>
          </>
        )}
      </div>
    </div>
  );
}
