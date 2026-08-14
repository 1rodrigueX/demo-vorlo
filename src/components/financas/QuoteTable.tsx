import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils/currency";
import { CHART_COLORS } from "@/lib/financas/categories";
import type { Quote } from "@/lib/market/brapi";

const compactNumber = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

export function QuoteTable({ quotes }: { quotes: Quote[] }) {
  if (quotes.length === 0) return <p className="text-sm text-[#898781]">Sem dados no momento.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-[#2c2c2a] text-left text-xs text-[#898781]">
            <th className="pb-2 pr-3 font-normal">Ativo</th>
            <th className="pb-2 pr-3 text-right font-normal">Preço</th>
            <th className="pb-2 pr-3 text-right font-normal">Variação</th>
            <th className="pb-2 pr-3 text-right font-normal">Mín–máx dia</th>
            <th className="pb-2 pr-3 text-right font-normal">52 semanas</th>
            <th className="pb-2 pr-3 text-right font-normal">P/L</th>
            <th className="pb-2 pr-3 text-right font-normal">Volume</th>
            <th className="pb-2 text-right font-normal">Valor de mercado</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => {
            const isUp = q.changePercent >= 0;
            return (
              <tr key={q.symbol} className="border-b border-[#2c2c2a] last:border-0">
                <td className="py-2 pr-3">
                  <p className="font-medium text-white">{q.symbol}</p>
                  <p className="max-w-[160px] truncate text-xs text-[#898781]">{q.name}</p>
                </td>
                <td className="py-2 pr-3 text-right text-white">{formatCurrency(q.price)}</td>
                <td className="py-2 pr-3 text-right">
                  <span
                    className="inline-flex items-center gap-1 font-medium"
                    style={{ color: isUp ? CHART_COLORS.green : CHART_COLORS.red }}
                  >
                    {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {Math.abs(q.changePercent).toFixed(2)}%
                  </span>
                </td>
                <td className="py-2 pr-3 text-right text-xs text-[#c3c2b7]">{q.dayRange ?? "—"}</td>
                <td className="py-2 pr-3 text-right text-xs text-[#c3c2b7]">{q.fiftyTwoWeekRange ?? "—"}</td>
                <td className="py-2 pr-3 text-right text-xs text-[#c3c2b7]">
                  {q.priceEarnings !== null ? q.priceEarnings.toFixed(1) : "—"}
                </td>
                <td className="py-2 pr-3 text-right text-xs text-[#c3c2b7]">
                  {q.volume !== null ? compactNumber.format(q.volume) : "—"}
                </td>
                <td className="py-2 text-right text-xs text-[#c3c2b7]">
                  {q.marketCap !== null ? formatCurrencyCompact(q.marketCap) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
