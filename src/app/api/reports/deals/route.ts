import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateReportRequest } from "@/lib/reports/authenticateRequest";

/** Feed em JSON pro Power BI ("Obter Dados > Web") — uma linha por negócio, pronta pra virar tabela/gráfico. */
export async function GET(request: Request) {
  const auth = await authenticateReportRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Chave de API inválida ou ausente" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("deals")
    .select(
      "id, title, value, status, created_at, closed_at, proposal_sent_at, stage:pipeline_stages(name), contact:contacts(name, email, phone, company_id), owner:profiles(full_name)",
    )
    .eq("tenant_id", auth.tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const deals = data ?? [];
  const companyIds = [...new Set(deals.map((d) => d.contact?.company_id).filter((id): id is string => !!id))];
  const { data: companies } = companyIds.length
    ? await admin.from("companies").select("id, name").in("id", companyIds)
    : { data: [] };
  const companyNameById = new Map((companies ?? []).map((c) => [c.id, c.name]));

  const rows = deals.map((d) => ({
    id: d.id,
    titulo: d.title,
    valor: Number(d.value),
    status: d.status,
    estagio: d.stage?.name ?? null,
    contato: d.contact?.name ?? null,
    email_contato: d.contact?.email ?? null,
    telefone_contato: d.contact?.phone ?? null,
    empresa: d.contact?.company_id ? (companyNameById.get(d.contact.company_id) ?? null) : null,
    vendedor: d.owner?.full_name ?? null,
    criado_em: d.created_at,
    proposta_enviada_em: d.proposal_sent_at,
    fechado_em: d.closed_at,
  }));

  return NextResponse.json(rows);
}
