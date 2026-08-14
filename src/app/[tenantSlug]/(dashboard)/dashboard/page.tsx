import Link from "next/link";
import { redirect } from "next/navigation";
import { DollarSign, TrendingUp, Briefcase } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/currency";
import { formatMinutes } from "@/lib/utils/duration";
import { PipelineValueCard } from "@/components/dashboard/PipelineValueCard";
import { StatTile } from "@/components/dashboard/StatTile";
import { MessagesReceivedCard } from "@/components/dashboard/MessagesReceivedCard";
import { LeadSourcesDonut } from "@/components/dashboard/LeadSourcesDonut";
import { StageCountChart } from "@/components/dashboard/StageCountChart";
import { ConversionFunnel } from "@/components/dashboard/ConversionFunnel";
import { OpenProposalsCard } from "@/components/dashboard/OpenProposalsCard";
import { ClosedDealsCard } from "@/components/dashboard/ClosedDealsCard";
import { RevenueTrendChart } from "@/components/dashboard/RevenueTrendChart";
import { SalesBySellerChart } from "@/components/dashboard/SalesBySellerChart";
import { PowerBiExportButton } from "@/components/dashboard/PowerBiExportButton";
import { DashboardFiltersBar } from "@/components/dashboard/DashboardFiltersBar";
import { getDashboardData } from "@/lib/dashboard/getDashboardData";
import { getConversationMetrics } from "@/lib/dashboard/getConversationMetrics";
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
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ tab?: string; period?: string; from?: string; to?: string; owner?: string }>;
}) {
  const { tenantSlug } = await params;
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
  const tenantId = user ? await requireTenantId(supabase, user.id) : null;
  if (!tenantId) redirect("/login");

  const [{ data: apiKeys }, { data: sellerProfiles }, data, conversation] = await Promise.all([
    isAdmin
      ? supabase
          .from("tenant_api_keys")
          .select("id, name, key_prefix, created_at, last_used_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
    supabase.from("profiles").select("id, full_name").eq("tenant_id", tenantId).order("full_name"),
    getDashboardData(supabase, { from, to, ownerId, tenantId }),
    getConversationMetrics(supabase, { from, to, ownerId, tenantId }),
  ]);

  const {
    allDeals,
    openDeals,
    wonDeals,
    wonInPeriodValue,
    wonInPeriodCount,
    lostDealsCount,
    totalPipelineValue,
    contactsCount,
    revenueTrend,
    salesBySeller,
    stageSummaries,
    proposals,
    closedDeals,
  } = data;

  const dateRangeLabel = `${from.toLocaleDateString("pt-BR")} — ${to.toLocaleDateString("pt-BR")}`;

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
    return qs ? `/${tenantSlug}/dashboard?${qs}` : `/${tenantSlug}/dashboard`;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Visão geral do funil de vendas da equipe.</p>
        </div>
        <div className="flex items-center gap-2">
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
          {/* Atendimento — conversas e canais */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MessagesReceivedCard
              total={conversation.messagesReceived}
              channels={conversation.messagesByChannel}
              periodLabel={dateRangeLabel}
            />
            <StatTile
              label="Conversas em andamento"
              value={conversation.conversationsActive}
              sub={dateRangeLabel}
              accent="cyan"
            />
            <StatTile
              label="Conversas não respondidas"
              value={conversation.conversationsUnanswered}
              sub="aguardando resposta da equipe"
              accent="amber"
            />
            <LeadSourcesDonut data={conversation.leadSources} />
          </div>

          {/* Tempo de atendimento + resultado de leads */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Tempo de resposta" value={formatMinutes(conversation.avgResponseMinutes)} sub="média no período" />
            <StatTile label="Maior tempo esperando" value={formatMinutes(conversation.longestWaitingMinutes)} sub="conversa sem resposta" accent="red" />
            <StatTile
              label="Leads ganhos"
              value={wonInPeriodCount}
              sub={formatCurrency(wonInPeriodValue)}
              accent="green"
            />
            <StatTile
              label="Leads ativos"
              value={openDeals.length}
              sub={formatCurrency(totalPipelineValue)}
              accent="cyan"
            />
          </div>

          {/* Funil — resumo */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Leads perdidos" value={lostDealsCount} sub={`perdidos ${PERIOD_LABEL[period]}`} accent="red" />
            <StatTile label={`Leads cadastrados`} value={contactsCount} sub={dateRangeLabel} accent="violet" />
            <StatTile label="Propostas abertas" value={proposals.length} sub={`enviadas ${PERIOD_LABEL[period]}`} accent="violet" />
            <StatTile label={`Ganho ${PERIOD_LABEL[period]}`} value={formatCurrency(wonInPeriodValue)} sub={`${wonInPeriodCount} negócio(s)`} accent="green" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <RevenueTrendChart data={revenueTrend} />
            <SalesBySellerChart data={salesBySeller} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <StageCountChart stages={stageSummaries} />
            <ConversionFunnel totalDeals={allDeals.length} wonDeals={wonDeals.length} />
          </div>

          <OpenProposalsCard proposals={proposals} tenantSlug={tenantSlug} />
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

          <ClosedDealsCard deals={closedDeals} tenantSlug={tenantSlug} />
        </>
      )}
    </div>
  );
}
