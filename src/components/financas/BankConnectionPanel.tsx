"use client";

import { useState, useTransition } from "react";
import { Landmark, RefreshCw, Unplug, CreditCard } from "lucide-react";
import { connectBank, resyncBank, disconnectBank, type ActionState } from "@/lib/actions/financas-bank";
import { formatCurrency } from "@/lib/utils/currency";
import type { FinancasBankConnection } from "@/types/domain";

export function BankConnectionPanel({
  connection,
  cardSpendMes,
  onChanged,
}: {
  connection: FinancasBankConnection | null;
  cardSpendMes: number;
  onChanged: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<ActionState>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
      else onChanged();
    });
  }

  const isConnected = connection?.status === "connected";

  return (
    <div className="rounded-xl border border-[#2c2c2a] bg-[#1a1a19] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Landmark size={16} className="text-[#3987e5]" />
          <div>
            <p className="text-sm font-medium text-white">{isConnected ? connection?.institution_name : "Conectar banco"}</p>
            <p className="text-xs text-[#898781]">
              {isConnected
                ? `Última sincronização ${connection?.last_synced_at ? new Date(connection.last_synced_at).toLocaleString("pt-BR") : "—"} · modo simulado`
                : "Importe extrato e fatura de cartão automaticamente — modo simulado, sem banco real conectado ainda"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isConnected && (
            <div className="flex items-center gap-1.5 rounded-md border border-[#383835] px-3 py-1.5 text-xs text-[#c3c2b7]">
              <CreditCard size={12} className="text-[#d95926]" />
              Cartão no mês: <span className="font-medium text-white">{formatCurrency(cardSpendMes)}</span>
            </div>
          )}

          {isConnected ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(resyncBank)}
                className="flex items-center gap-1.5 rounded-md border border-[#383835] px-3 py-1.5 text-xs text-[#c3c2b7] transition-colors hover:text-white disabled:opacity-50"
              >
                <RefreshCw size={12} />
                Sincronizar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(disconnectBank)}
                className="flex items-center gap-1.5 rounded-md border border-[#383835] px-3 py-1.5 text-xs text-[#898781] transition-colors hover:text-red-400 disabled:opacity-50"
              >
                <Unplug size={12} />
                Desconectar
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(connectBank)}
              className="flex items-center gap-1.5 rounded-md bg-[#3987e5] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Landmark size={12} />
              {isPending ? "Conectando..." : "Conectar banco (simulado)"}
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
