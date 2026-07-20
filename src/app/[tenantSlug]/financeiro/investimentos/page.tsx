import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSelicMeta, getCdiAnualizado } from "@/lib/market/bcb";
import { getAcoesWatchlist, getFiisWatchlist, hasBrapiToken, type Quote } from "@/lib/market/brapi";
import { formatCurrency } from "@/lib/utils/currency";
import { CHART_COLORS } from "@/lib/financas/categories";

/**
 * Painel informativo de mercado — cotações (brapi.dev) e Selic/CDI (Banco
 * Central, API oficial). De propósito NÃO recomenda "ações pra comprar":
 * isso é atividade regulada pela CVM (consultoria de valores mobiliários) e
 * o app não tem esse credenciamento. O que dá pra mostrar com segurança é
 * dado neutro — cotação, indicadores oficiais, e educação sobre como
 * comparar uma oferta de CDB contra o CDI.
 */
export default async function InvestimentosPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: hasAccess } = await supabase.rpc("current_tenant_has_financas");
  if (!hasAccess) redirect("/comprar-financas");

  const [selicMeta, cdiAnualizado, acoes, fiis] = await Promise.all([
    getSelicMeta(),
    getCdiAnualizado(),
    getAcoesWatchlist(),
    getFiisWatchlist(),
  ]);
  const tokenConfigured = hasBrapiToken();

  return (
    <div className="min-h-screen px-6 py-6" style={{ background: "#0d0d0d", color: "#ffffff" }}>
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/${tenantSlug}/financeiro`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#898781] hover:text-white"
        >
          <ArrowLeft size={14} />
          Voltar pro dashboard
        </Link>
        <h1 className="text-xl font-semibold text-white">Investimentos</h1>
        <p className="mt-1 text-sm text-[#898781]">
          Dados informativos de mercado — não é recomendação de investimento.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <IndicatorTile label="Selic (meta atual)" value={selicMeta} description="Definida pelo Copom a cada ~45 dias." />
          <IndicatorTile label="CDI (anualizado)" value={cdiAnualizado} description="Referência da maioria dos CDBs." />
        </div>

        <div className="mt-4 rounded-xl border border-[#2c2c2a] bg-[#1a1a19] p-4">
          <p className="text-sm font-medium text-[#c3c2b7]">Como comparar um CDB</p>
          <p className="mt-2 text-sm text-[#898781]">
            Não existe uma fonte pública que publique "taxa de CDB do banco X" — cada banco e corretora define a sua.
            Quando for comparar uma oferta, olhe o percentual do CDI que ela paga: abaixo de 100% do CDI costuma
            perder para alternativas mais simples e líquidas (Tesouro Selic, por exemplo); acima de 100% tende a ser
            mais competitivo, mas confira o prazo de resgate e se tem garantia do FGC.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {tokenConfigured ? (
            <>
              <QuotePanel title="Principais ações (Ibovespa)" quotes={acoes} />
              <QuotePanel title="Principais Fundos Imobiliários" quotes={fiis} />
            </>
          ) : (
            <div className="lg:col-span-2 rounded-xl border border-[#2c2c2a] bg-[#1a1a19] p-4">
              <p className="text-sm font-medium text-[#c3c2b7]">Cotações ainda não configuradas</p>
              <p className="mt-2 text-sm text-[#898781]">
                Pra mostrar cotação de ações e FIIs aqui, crie uma conta grátis em brapi.dev, pegue o token no
                dashboard deles e configure a variável de ambiente <code className="text-white">BRAPI_TOKEN</code> no
                servidor.
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-xs text-[#5f5e59]">
          Cotações podem ter atraso em relação ao mercado. Consulte um profissional certificado antes de investir —
          nada nesta página é recomendação de compra ou venda.
        </p>
      </div>
    </div>
  );
}

function IndicatorTile({ label, value, description }: { label: string; value: number | null; description: string }) {
  return (
    <div className="rounded-xl border border-[#2c2c2a] bg-[#1a1a19] p-4">
      <p className="text-xs text-[#898781]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value !== null ? `${value.toFixed(2)}%` : "—"}</p>
      <p className="mt-1 text-xs text-[#5f5e59]">{description}</p>
    </div>
  );
}

function QuotePanel({ title, quotes }: { title: string; quotes: Quote[] }) {
  return (
    <div className="rounded-xl border border-[#2c2c2a] bg-[#1a1a19] p-4">
      <p className="mb-3 text-sm font-medium text-[#c3c2b7]">{title}</p>
      {quotes.length === 0 && <p className="text-sm text-[#898781]">Sem dados no momento.</p>}
      <div className="space-y-2">
        {quotes.map((q) => {
          const isUp = q.changePercent >= 0;
          return (
            <div key={q.symbol} className="flex items-center justify-between text-sm">
              <div className="min-w-0">
                <p className="font-medium text-white">{q.symbol}</p>
                <p className="truncate text-xs text-[#898781]">{q.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white">{formatCurrency(q.price)}</span>
                <span
                  className="flex w-16 items-center justify-end gap-1 text-xs font-medium"
                  style={{ color: isUp ? CHART_COLORS.green : CHART_COLORS.red }}
                >
                  {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(q.changePercent).toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
