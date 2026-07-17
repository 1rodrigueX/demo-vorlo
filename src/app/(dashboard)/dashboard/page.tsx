import Link from "next/link";
import { DollarSign, TrendingUp, Briefcase, Users, FileDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";
import { PipelineValueCard } from "@/components/dashboard/PipelineValueCard";
import { StageCountChart } from "@/components/dashboard/StageCountChart";
import { ConversionFunnel } from "@/components/dashboard/ConversionFunnel";
import { OpenProposalsCard } from "@/components/dashboard/OpenProposalsCard";
import { ClosedDealsCard } from "@/components/dashboard/ClosedDealsCard";
import { RevenueTrendChart } from "@/components/dashboard/RevenueTrendChart";
import { SalesBySellerChart } from "@/components/dashboard/SalesBySellerChart";
import { PowerBiExportButton } from "@/components/dashboard/PowerBiExportButton";
import { DashboardFiltersBar } from "@/components/dashboard/DashboardFiltersBar";
import { getDashboardData } from "@/lib/dashboard/getDashboardData";
import { resolvePeriod, type PeriodPreset } from "@/lib/dashboard/period";

const tabs = [
  { value: "overview", label: "Visão geral" },
  { value: "fechados", label: "Fechados" },
] as const;

const PERIOD_LABEL: Record<PeriodPreset, string> = {
  today: "hoje",
  week: "na semana",
  month: "no mês",
  custom: "no período",
};

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; period?: string; from?: string; to?: string; owner?: string }>;
}) {
  const { tab, period: periodParam, from: fromParam, to: toParam, owner } = await searchParams;
  const activeTab = tab === "fechados" ? "fechados" : "overview";
  const period: PeriodPreset = (["today", "week", "month", "custom"] as const).includes(
    periodParam as PeriodPreset,
  )
    ? (periodParam as PeriodPreset)
    : "month";
  const ownerId = owner || null;

  const { from, to } = resolvePeriod(period, fromParam, toParam);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const isAdmin = currentProfile?.role === "owner" || currentProfile?.role === "manager";

  const [{ data: apiKeys }, { data: sellerProfiles }, data] = await Promise.all([
    isAdmin
      ? supabase
          .from("tenant_api_keys")
          .select("id, name, key_prefix, created_at, last_used_at")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
    supabase.from("profiles").select("id, full_name").order("full_name"),
    getDashboardData(supabase, { from, to, ownerId }),
  ]);

  const {
    allDeals,
    openDeals,
    wonDeals,
    wonInPeriodValue,
    totalPipelineValue,
    contactsCount,
    revenueTrend,
    salesBySeller,
    stageSummaries,
    proposals,
    closedDeals,
  } = data;

  const sellers = (sellerProfiles ?? []).map((p) => ({ id: p.id, name: p.full_name || "Sem nome" }));

  const filterQuery = new URLSearchParams();
  if (period !== "month") filterQuery.set("period", period);
  if (period === "custom") {
    filterQuery.set("from", fromParam ?? toDateInputValue(from));
    filterQuery.set("to", toParam ?? toDateInputValue(to));
  }
  if (ownerId) filterQuery.set("owner", ownerId);
  const filterQueryString = filterQuery.toString();

  function tabHref(value: string) {
    const params = new URLSearchParams(filterQueryString);
    if (value !== "overview") params.set("tab", value);
    const qs = params.toString();
    return qs ? `/dashboard?${qs}` : "/dashboard";
  }

  const exportHref = `/api/dashboard/export?${new URLSearchParams({
    period,
    from: fromParam ?? toDateInputValue(from),
    to: toParam ?? toDateInputValue(to),
    ...(ownerId ? { owner: ownerId } : {}),
  }).toString()}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Visão geral do funil de vendas da equipe.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={exportHref}>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-panel px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <FileDown size={15} />
              Exportar Excel
            </button>
          </a>
          {isAdmin && (
            <PowerBiExportButton
              apiKeys={apiKeys ?? []}
              siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "http://45.149.153.20"}
            />
          )}
        </div>
      </div>

      <DashboardFiltersBar
        sellers={sellers}
        period={period}
        from={fromParam ?? toDateInputValue(from)}
        to={toParam ?? toDateInputValue(to)}
        ownerId={ownerId}
      />

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={tabHref(t.value)}
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
              label={`Ganho ${PERIOD_LABEL[period]}`}
              value={wonInPeriodValue}
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
              label={`Leads cadastrados ${PERIOD_LABEL[period]}`}
              value={contactsCount}
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
              label={`Ganho ${PERIOD_LABEL[period]}`}
              value={wonInPeriodValue}
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
