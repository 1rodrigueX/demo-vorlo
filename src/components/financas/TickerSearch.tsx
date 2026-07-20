"use client";

import { useActionState } from "react";
import { Search } from "lucide-react";
import { searchTickerAction, type SearchTickerState } from "@/lib/actions/financas-market";
import { QuoteTable } from "@/components/financas/QuoteTable";

export function TickerSearch() {
  const [state, formAction, isPending] = useActionState<SearchTickerState, FormData>(searchTickerAction, null);

  return (
    <div className="rounded-xl border border-[#2c2c2a] bg-[#1a1a19] p-4">
      <p className="mb-3 text-sm font-medium text-[#c3c2b7]">Buscar qualquer ativo da B3</p>
      <form action={formAction} className="flex items-center gap-2">
        <input
          name="symbol"
          placeholder="Ex: MGLU3, HGRE11..."
          className="flex-1 rounded-md border border-[#383835] bg-[#0d0d0d] px-3 py-1.5 text-sm text-white placeholder:text-[#898781] focus:outline-none focus:ring-1 focus:ring-[#3987e5]"
        />
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-md bg-[#3987e5] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Search size={14} />
          {isPending ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {state?.error && <p className="mt-3 text-sm text-red-400">{state.error}</p>}
      {state?.quote && (
        <div className="mt-3">
          <QuoteTable quotes={[state.quote]} />
        </div>
      )}
    </div>
  );
}
