import Link from "next/link";
import { DollarSign, TrendingUp, Briefcase, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";
import { PipelineValueCard } from "@/components/dashboard/PipelineValueCard";
import { StageCountChart, type StageSummary } from "@/components/dashboard/StageCountChart";
import { ConversionFunnel } from "@/components/dashboard/ConversionFunnel";
import { OpenProposalsCard, type OpenProposal } from "@/components/dashboard/OpenProposalsCard";
import { ClosedDealsCard, type ClosedDeal } from "@/components/dashboard/ClosedDealsCard";
import { RevenueTrendChart, type MonthlyRevenuePoint } from "@/components/dashboard/RevenueTrendChart";
import { SalesBySellerChart, type SellerSummary } from "@/components/dashboard/SalesBySellerChart";
import { PowerBiExportButton } from "@/components/dashboard/PowerBiExportButton";
import { daysSinceNow } from "@/lib/utils/dates";

const REVENUE_TREND_MONTHS = 6;
const MONTH_LABELS = [
  "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez",
];

const tabs = [
  { value: "overview", label: "Visão geral" },
  { value: "fechados", label: "Fechados" },
] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "fechados" ? "fechados" : "overview";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const isAdmin = currentProfile?.role === "owner" || currentProfile?.role === "manager";

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [{ data: stages }, { data: deals }, { count: contactsCount }, { data: openProposals }, { data: apiKeys }] =
    await Promise.all([
      supabase.from("pipeline_stages").select("*").order("position"),
      supabase
        .from("deals")
        .select(
          "id, title, stage_id, value, status, closed_at, owner_id, contact:contacts(id, name), owner:profiles(full_name)",
        ),
      supabase.from("contacts").select("id", { count: "exact", head: true }),
      supabase
        .from("deals")
        .select("id, value, proposal_sent_at, contact:contacts(id, name)")
        .eq("status", "open")
        .not("proposal_sent_at", "is", null)
        .order("proposal_sent_at", { ascending: true }),
      isAdmin
        ? supabase
            .from("tenant_api_keys")
            .select("id, name, key_prefix, created_at, last_used_at")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: null }),
    ]);

  const allDeals = deals ?? [];
  const openDeals = allDeals.filter((d) => d.status === "open");
  const wonDeals = allDeals.filter((d) => d.status === "won");
  const wonThisMonth = wonDeals.filter(
    (d) => d.closed_at && new Date(d.closed_at) >= startOfMonth,
  );

  const totalPipelineValue = openDeals.reduce((sum, d) => sum + Number(d.value), 0);
  const wonThisMonthValue = wonThisMonth.reduce((sum, d) => sum + Number(d.value), 0);

  const revenueTrend: MonthlyRevenuePoint[] = Array.from({ length: REVENUE_TREND_MONTHS }, (_, i) => {
    const ref = new Date();
    ref.setDate(1);
    ref.setMonth(ref.getMonth() - (REVENUE_TREND_MONTHS - 1 - i));
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
  for (const d of wonDeals) {
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

  const proposals: OpenProposal[] = (openProposals ?? [])
    .filter((p) => p.contact)
    .map((p) => ({
      dealId: p.id,
      contactId: p.contact!.id,
      contactName: p.contact!.name,
      value: Number(p.value),
      proposalSentAt: p.proposal_sent_at as string,
      daysSince: daysSinceNow(p.proposal_sent_at as string),
    }));

  const closedDeals: ClosedDeal[] = wonDeals
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Visão geral do funil de vendas da equipe.</p>
        </div>
        {isAdmin && (
          <PowerBiExportButton
            apiKeys={apiKeys ?? []}
            siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}
          />
        )}
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={t.value === "overview" ? "/dashboard" : `/dashboard?tab=${t.value}`}
            className={cn(
              "border-b-2 px-3 pb-2.5 text-sm font-medium transition-colors",
              activeTab === t.value
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-800",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === "overview" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PipelineValueCard
              label="Total em pipeline"
              value={totalPipelineValue}
              icon={DollarSign}
              color="indigo"
            />
            <PipelineValueCard
              label="Ganho este mês"
              value={wonThisMonthValue}
              icon={TrendingUp}
              color="emerald"
            />
            <PipelineValueCard
              label="Negócios abertos"
              value={openDeals.length}
              isCurrency={false}
              icon={Briefcase}
              color="amber"
            />
            <PipelineValueCard
              label="Leads cadastrados"
              value={contactsCount ?? 0}
              isCurrency={false}
              icon={Users}
              color="sky"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <RevenueTrendChart data={revenueTrend} />
            <SalesBySellerChart data={salesBySeller} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <StageCountChart stages={stageSummaries} />
            <ConversionFunnel totalDeals={allDeals.length} wonDeals={wonDeals.length} />
          </div>

          <OpenProposalsCard proposals={proposals} />
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PipelineValueCard
              label="Ganho este mês"
              value={wonThisMonthValue}
              icon={TrendingUp}
              color="emerald"
            />
            <PipelineValueCard
              label="Total de vendas fechadas"
              value={closedDeals.reduce((sum, d) => sum + d.value, 0)}
              icon={DollarSign}
              color="indigo"
            />
            <PipelineValueCard
              label="Negócios ganhos"
              value={closedDeals.length}
              isCurrency={false}
              icon={Briefcase}
              color="amber"
            />
          </div>

          <ClosedDealsCard deals={closedDeals} />
        </>
      )}
    </div>
  );
}
