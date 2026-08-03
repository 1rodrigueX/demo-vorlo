"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { checkModuleProvisioningStatus } from "@/lib/actions/module-checkout";
import { MODULE_CATALOG, type ModuleKey } from "@/lib/billing/modules";

/** Após o pagamento, o Mercado Pago redireciona pra cá; enquanto o webhook não
 * confirma, fica em polling. */
export function ModuleSuccessPoller({ module }: { module: ModuleKey }) {
  const [ready, setReady] = useState(false);
  const label = MODULE_CATALOG[module].label;

  useEffect(() => {
    let cancelled = false;
    async function check(id: ReturnType<typeof setInterval> | null) {
      const res = await checkModuleProvisioningStatus(module);
      if (!cancelled && res.ready) {
        setReady(true);
        if (id) clearInterval(id);
      }
    }
    const interval = setInterval(() => check(interval), 2500);
    void check(null);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [module]);

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-panel p-8 text-center shadow-sm">
      {ready ? (
        <>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={30} />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{label} liberado! 🎉</h1>
          <p className="mt-2 text-sm text-gray-600">Seu acesso ao módulo {label} já está ativo.</p>
          <Link href="/central">
            <Button className="mt-6 w-full">Ir para a central</Button>
          </Link>
        </>
      ) : (
        <>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <Loader2 size={28} className="animate-spin" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Confirmando seu pagamento...</h1>
          <p className="mt-2 text-sm text-gray-600">Isso leva alguns segundos. Não feche esta página.</p>
        </>
      )}
    </div>
  );
}
