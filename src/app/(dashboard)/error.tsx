"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Erro não tratado no dashboard:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-panel p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle size={22} />
        </div>
        <h1 className="text-lg font-semibold text-gray-900">Algo deu errado</h1>
        <p className="mt-2 text-sm text-gray-500">
          Essa parte do CRM travou por um instante. Tenta de novo — se continuar acontecendo, avisa a gente pela
          aba Suporte.
        </p>
        <Button className="mt-6" onClick={() => unstable_retry()}>
          Tentar de novo
        </Button>
      </div>
    </div>
  );
}
