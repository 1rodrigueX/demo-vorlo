import { DollarSign, TrendingUp, Briefcase, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PipelineValueCard } from "@/components/dashboard/PipelineValueCard";
import { StageCountChart, type StageSummary } from "@/components/dashboard/StageCountChart";
import { ConversionFunnel } from "@/components/dashboard/ConversionFunnel";
import { OpenProposalsCard, type OpenProposal } from "@/components/dashboard/OpenProposalsCard";
import { daysSinceNow } from "@/lib/utils/dates";

export default async function DashboardPage() {
  const supabase = await createClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [{ data: stages }, { data: deals }, { count: contactsCount }, { data: openProposals }] =
    await Promise.all([
      supabase.from("pipeline_stages").select("*").order("position"),
      supabase.from("deals").select("stage_id, value, status, closed_at"),
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
    const stageDeals = openDeals.filter((d) => d.stage_id === stage.id);
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Visão geral do funil de vendas da equipe.</p>
      </div>

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
    </div>
  );
}
