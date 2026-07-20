"use client";

import { useState, useTransition } from "react";
import { Inbox, Check, X } from "lucide-react";
import { approveInboxItem, dismissInboxItem } from "@/lib/actions/financas-inbox";
import { formatCurrency } from "@/lib/utils/currency";
import type { FinancasInboxItem } from "@/types/domain";

export function InboxPanel({ items, onChanged }: { items: FinancasInboxItem[]; onChanged: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function run(id: string, action: (id: string) => Promise<{ error?: string } | null>) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const result = await action(id);
      if (result?.error) setError(result.error);
      else onChanged();
      setBusyId(null);
    });
  }

  return (
    <div className="rounded-xl border border-[#2c2c2a] bg-[#1a1a19] p-4">
      <div className="flex items-center gap-2">
        <Inbox size={16} className="text-[#3987e5]" />
        <p className="text-sm font-medium text-white">Caixa de Entrada</p>
        {items.length > 0 && (
          <span className="rounded-full bg-[#3987e5] px-1.5 py-0.5 text-[10px] font-medium text-white">
            {items.length}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-[#898781]">Negócios ganhos no CRM caem aqui — aprove pra lançar como receita.</p>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-[#5f5e59]">Nada pendente.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[#2c2c2a] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-white">{item.description ?? item.category}</p>
                <p className="text-xs text-[#898781]">
                  {item.category} · {new Date(item.entry_date + "T00:00:00").toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-medium text-white">{formatCurrency(item.amount_cents / 100)}</span>
                <button
                  type="button"
                  disabled={isPending && busyId === item.id}
                  onClick={() => run(item.id, approveInboxItem)}
                  className="rounded-md border border-[#383835] p-1.5 text-[#199e70] transition-colors hover:bg-[#199e70]/10 disabled:opacity-50"
                  aria-label="Aprovar"
                >
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  disabled={isPending && busyId === item.id}
                  onClick={() => run(item.id, dismissInboxItem)}
                  className="rounded-md border border-[#383835] p-1.5 text-[#898781] transition-colors hover:bg-red-400/10 hover:text-red-400 disabled:opacity-50"
                  aria-label="Descartar"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
