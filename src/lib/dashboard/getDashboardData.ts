import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { StageSummary } from "@/components/dashboard/StageCountChart";
import type { SellerSummary } from "@/components/dashboard/SalesBySellerChart";
import type { MonthlyRevenuePoint } from "@/components/dashboard/RevenueTrendChart";
import type { OpenProposal } from "@/components/dashboard/OpenProposalsCard";
import type { ClosedDeal } from "@/components/dashboard/ClosedDealsCard";
import { daysSinceNow } from "@/lib/utils/dates";

const MONTH_LABELS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export type DashboardFilters = {
  /** Início do período (inclusive) — só afeta métricas baseadas em data (ganho, vendas, propostas, fechados). */
  from: Date;
  /** Fim do período (inclusive). */
  to: Date;
  /** Filtra por vendedor (deals.owner_id / contacts.created_by) — null = todos. */
  ownerId: string | null;
};

/**
 * "Total em pipeline"/"Negócios abertos"/"Negócios por estágio" são uma foto do
 * funil AGORA (não fazem sentido presos a um período — um negócio aberto há 3
 * meses continua contando no pipeline de hoje), só respeitam o filtro de
 * vendedor. Ganho/vendas/propostas/fechados são eventos históricos, então
 * respeitam vendedor + período.
 */
export async function getDashboardData(supabase: SupabaseClient<Database>, filters: DashboardFilters) {
  const { from, to, ownerId } = filters;

  let dealsQuery = supabase
    .from("deals")
    .select(
      "id, title, stage_id, value, status, closed_at, proposal_sent_at, owner_id, contact:contacts(id, name), owner:profiles(full_name)",
    );
  if (ownerId) dealsQuery = dealsQuery.eq("owner_id", ownerId);

  let contactsQuery = supabase.from("contacts").select("id", { count: "exact", head: true });
  if (ownerId) contactsQuery = contactsQuery.eq("created_by", ownerId);
  contactsQuery = contactsQuery.gte("created_at", from.toISOString()).lte("created_at", to.toISOString());

  const [{ data: stages }, { data: deals }, { count: contactsCount }] = await Promise.all([
    supabase.from("pipeline_stages").select("*").order("position"),
    dealsQuery,
    contactsQuery,
  ]);

  const allDeals = deals ?? [];
  const openDeals = allDeals.filter((d) => d.status === "open");
  const wonDeals = allDeals.filter((d) => d.status === "won");
  const wonInPeriod = wonDeals.filter((d) => d.closed_at && isWithin(new Date(d.closed_at), from, to));
  const proposalsInPeriod = openDeals.filter((d) => d.proposal_sent_at && isWithin(new Date(d.proposal_sent_at), from, to));

  const totalPipelineValue = openDeals.reduce((sum, d) => sum + Number(d.value), 0);
  const wonInPeriodValue = wonInPeriod.reduce((sum, d) => sum + Number(d.value), 0);

  // Sempre uma janela fixa de 6 meses terminando em "to", independente do
  // filtro de período escolhido — com o filtro "mês" (padrão), from/to caem
  // no mesmo mês e monthsBetweenInclusive(from, to) dava 1, então o gráfico
  // só tinha 1 ponto e a linha nunca aparecia (precisa de 2+ pra desenhar).
  const trendMonths = 6;
  const revenueTrend: MonthlyRevenuePoint[] = Array.from({ length: trendMonths }, (_, i) => {
    const ref = new Date(to);
    ref.setDate(1);
    ref.setMonth(ref.getMonth() - (trendMonths - 1 - i));
    const monthKey = `${ref.getFullYear()}-${ref.getMonth()}`;
    const value = wonDeals
      .filter((d) => {
        if (!d.closed_at) return false;
        const closed = new Date(d.closed_at);
        return closed.getFullYear() === ref.getFullYear() && closed.getMonth() === ref.getMonth();
      })
      .reduce((sum, d) => sum + Number(d.value), 0);
    return { month: monthKey, label: `${MONTH_LABELS[ref.getMonth()]}/${String(ref.getFullYear()).slice(2)}`, value };
  });

  const sellerTotals = new Map<string, { name: string; value: number; count: number }>();
  for (const d of wonInPeriod) {
    const name = d.owner?.full_name || "Sem vendedor";
    const current = sellerTotals.get(d.owner_id) ?? { name, value: 0, count: 0 };
    current.value += Number(d.value);
    current.count += 1;
    sellerTotals.set(d.owner_id, current);
  }
  const salesBySeller: SellerSummary[] = [...sellerTotals.entries()]
    .map(([sellerId, s]) => ({ sellerId, name: s.name, value: s.value, count: s.count }))
    .sort((a, b) => b.value - a.value);

  const stageSummaries: StageSummary[] = (stages ?? []).map((stage) => {
    const stageDeals = allDeals.filter((d) => d.stage_id === stage.id && d.status !== "lost");
    return {
      id: stage.id,
      name: stage.name,
      color: stage.color,
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + Number(d.value), 0),
    };
  });

  const proposals: OpenProposal[] = proposalsInPeriod
    .filter((p) => p.contact && p.proposal_sent_at)
    .map((p) => ({
      dealId: p.id,
      contactId: p.contact!.id,
      contactName: p.contact!.name,
      value: Number(p.value),
      proposalSentAt: p.proposal_sent_at as string,
      daysSince: daysSinceNow(p.proposal_sent_at as string),
    }))
    .sort((a, b) => new Date(a.proposalSentAt).getTime() - new Date(b.proposalSentAt).getTime());

  const closedDeals: ClosedDeal[] = wonInPeriod
    .filter((d) => d.contact && d.closed_at)
    .map((d) => ({
      dealId: d.id,
      contactId: d.contact!.id,
      contactName: d.contact!.name,
      title: d.title,
      value: Number(d.value),
      closedAt: d.closed_at as string,
    }))
    .sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());

  return {
    allDeals,
    openDeals,
    wonDeals,
    wonInPeriodValue,
    totalPipelineValue,
    contactsCount: contactsCount ?? 0,
    revenueTrend,
    salesBySeller,
    stageSummaries,
    proposals,
    closedDeals,
  };
}

function isWithin(date: Date, from: Date, to: Date): boolean {
  return date >= from && date <= to;
}
