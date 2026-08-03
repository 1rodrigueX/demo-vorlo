"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { generateLeadResumo, type LeadResumo } from "@/lib/actions/lead-resumo";

/** Card "IA · Resumo": gera, sob demanda, um resumo da conversa com
 * probabilidade de fechamento e próxima ação sugerida. */
export function LeadResumoCard({ contactId }: { contactId: string }) {
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState<LeadResumo | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    const res = await generateLeadResumo(contactId);
    setLoading(false);
    if (res.ok) setResumo(res.data);
    else setError(res.error);
  }

  return (
    <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/5 p-3.5">
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkles size={14} className="text-indigo-500" />
        <p className="text-xs font-semibold text-gray-900">IA · Resumo</p>
      </div>

      {resumo ? (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-gray-600">{resumo.resumo}</p>
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
              <span>Probabilidade de fechamento</span>
              <span className="font-semibold text-gray-900">{resumo.probabilidade}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${resumo.probabilidade}%`, background: "linear-gradient(90deg,#7c5cf6,#6d47f0)" }}
              />
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-panel/60 p-2">
            <p className="text-[11px] font-semibold text-gray-500">Próxima ação sugerida</p>
            <p className="mt-0.5 text-xs text-gray-700">{resumo.proximaAcao}</p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="text-[11px] font-medium text-indigo-500 transition-colors hover:text-indigo-400 disabled:opacity-50"
          >
            {loading ? "Gerando..." : "Gerar novamente"}
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <p className="text-xs text-gray-500">
            Gere um resumo da conversa com probabilidade de fechamento e próxima ação sugerida.
          </p>
          {error && <p className="text-[11px] text-red-500">{error}</p>}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            style={{ background: "linear-gradient(135deg,#7c5cf6,#6d47f0)" }}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-indigo-500/30 transition-all hover:brightness-110 disabled:opacity-50"
          >
            <Sparkles size={13} />
            {loading ? "Gerando..." : "Gerar resumo com IA"}
          </button>
        </div>
      )}
    </div>
  );
}
