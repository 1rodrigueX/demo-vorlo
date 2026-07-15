import Link from "next/link";
import { DollarSign, TrendingUp, Briefcase, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";
import { PipelineValueCard } from "@/components/dashboard/PipelineValueCard";
import { StageCountChart, type StageSummary } from "@/components/dashboard/StageCountChart";
import { ConversionFunnel } from "@/components/dashboard/ConversionFunnel";
import { OpenProposalsCard, type OpenProposal } from "@/components/dashboard/OpenProposalsCard";
import { ClosedDealsCard, type ClosedDeal } from "@/components/dashboard/ClosedDealsCard";
import { daysSinceNow } from "@/lib/utils/dates";

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

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [{ data: stages }, { data: deals }, { count: contactsCount }, { data: openProposals }] =
    await Promise.all([
      supabase.from("pipeline_stages").select("*").order("position"),
      supabase
        .from("deals")
        .select("id, title, stage_id, value, status, closed_at, contact:contacts(id, name)"),
      supabase.from("contacts").select("id", { count: "exact", head: true }),
      supabase
        .from("deals")
        .select("id, value, proposal_sent_at, contact:contacts(id, name)")
        .eq("status", "open")
        .not("proposal_sent_at", "is", null)
        .order("proposal_sent_at", { ascending: true }),
    ]);

  const allDeals = deals ?? [];
  const openDeals = allDeals.filter((d) => d.status === "open");
  const wonDeals = allDeals.filter((d) => d.status === "won");
  const wonThisMonth = wonDeals.filter(
    (d) => d.closed_at && new Date(d.closed_at) >= startOfMonth,
  );

  const totalPipelineValue = openDeals.reduce((sum, d) => sum + Number(d.value), 0);
  const wonThisMonthValue = wonThisMonth.reduce((sum, d) => sum + Number(d.value), 0);

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Visão geral do funil de vendas da equipe.</p>
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
