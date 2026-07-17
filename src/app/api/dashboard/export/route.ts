import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/dashboard/getDashboardData";
import { resolvePeriod, type PeriodPreset } from "@/lib/dashboard/period";
import { formatCurrency } from "@/lib/utils/currency";

const PERIOD_LABEL: Record<PeriodPreset, string> = {
  today: "Hoje",
  week: "Esta semana",
  month: "Este mês",
  custom: "Período personalizado",
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada, faça login novamente" }, { status: 401 });

  const url = new URL(request.url);
  const periodParam = url.searchParams.get("period");
  const period: PeriodPreset = (["today", "week", "month", "custom"] as const).includes(
    periodParam as PeriodPreset,
  )
    ? (periodParam as PeriodPreset)
    : "month";
  const ownerId = url.searchParams.get("owner");
  const { from, to } = resolvePeriod(period, url.searchParams.get("from") ?? undefined, url.searchParams.get("to") ?? undefined);

  const data = await getDashboardData(supabase, { from, to, ownerId });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FALA AI CRM";
  workbook.created = new Date();

  const dateFmt = (d: Date) => d.toLocaleDateString("pt-BR");

  const resumo = workbook.addWorksheet("Resumo");
  resumo.columns = [
    { header: "Métrica", key: "metric", width: 32 },
    { header: "Valor", key: "value", width: 20 },
  ];
  resumo.addRows([
    { metric: "Período", value: `${PERIOD_LABEL[period]} (${dateFmt(from)} a ${dateFmt(to)})` },
    { metric: "Total em pipeline (aberto)", value: formatCurrency(data.totalPipelineValue) },
    { metric: `Ganho no período`, value: formatCurrency(data.wonInPeriodValue) },
    { metric: "Negócios abertos", value: data.openDeals.length },
    { metric: "Leads cadastrados no período", value: data.contactsCount },
    { metric: "Total de negócios (histórico)", value: data.allDeals.length },
    { metric: "Negócios ganhos (histórico)", value: data.wonDeals.length },
  ]);
  resumo.getRow(1).font = { bold: true };

  const sellerSheet = workbook.addWorksheet("Vendas por vendedor");
  sellerSheet.columns = [
    { header: "Vendedor", key: "name", width: 28 },
    { header: "Negócios ganhos", key: "count", width: 16 },
    { header: "Valor ganho", key: "value", width: 18 },
  ];
  sellerSheet.addRows(data.salesBySeller.map((s) => ({ name: s.name, count: s.count, value: formatCurrency(s.value) })));
  sellerSheet.getRow(1).font = { bold: true };

  const stageSheet = workbook.addWorksheet("Negócios por estágio");
  stageSheet.columns = [
    { header: "Estágio", key: "name", width: 22 },
    { header: "Quantidade", key: "count", width: 14 },
    { header: "Valor", key: "value", width: 18 },
  ];
  stageSheet.addRows(data.stageSummaries.map((s) => ({ name: s.name, count: s.count, value: formatCurrency(s.value) })));
  stageSheet.getRow(1).font = { bold: true };

  const proposalsSheet = workbook.addWorksheet("Propostas em aberto");
  proposalsSheet.columns = [
    { header: "Contato", key: "contact", width: 28 },
    { header: "Valor", key: "value", width: 16 },
    { header: "Enviada em", key: "sentAt", width: 16 },
    { header: "Dias desde o envio", key: "daysSince", width: 18 },
  ];
  proposalsSheet.addRows(
    data.proposals.map((p) => ({
      contact: p.contactName,
      value: formatCurrency(p.value),
      sentAt: dateFmt(new Date(p.proposalSentAt)),
      daysSince: p.daysSince,
    })),
  );
  proposalsSheet.getRow(1).font = { bold: true };

  const closedSheet = workbook.addWorksheet("Negócios fechados");
  closedSheet.columns = [
    { header: "Contato", key: "contact", width: 28 },
    { header: "Negócio", key: "title", width: 28 },
    { header: "Valor", key: "value", width: 16 },
    { header: "Fechado em", key: "closedAt", width: 16 },
  ];
  closedSheet.addRows(
    data.closedDeals.map((d) => ({
      contact: d.contactName,
      title: d.title,
      value: formatCurrency(d.value),
      closedAt: dateFmt(new Date(d.closedAt)),
    })),
  );
  closedSheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="dashboard-fala-ai-crm-${dateFmt(new Date()).replaceAll("/", "-")}.xlsx"`,
    },
  });
}
