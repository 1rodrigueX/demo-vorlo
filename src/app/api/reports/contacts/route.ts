import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateReportRequest } from "@/lib/reports/authenticateRequest";

/** Feed em JSON pro Power BI ("Obter Dados > Web") — uma linha por contato. */
export async function GET(request: Request) {
  const auth = await authenticateReportRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Chave de API inválida ou ausente" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contacts")
    .select("id, name, email, phone, lead_source, created_at, company:companies(name), owner:profiles(full_name)")
    .eq("tenant_id", auth.tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const contacts = data ?? [];
  const contactIds = contacts.map((c) => c.id);
  const { data: contactTagRows } = contactIds.length
    ? await admin.from("contact_tags").select("contact_id, tag:tags(name)").in("contact_id", contactIds)
    : { data: [] };

  const tagNamesByContact = new Map<string, string[]>();
  for (const row of contactTagRows ?? []) {
    if (!row.tag?.name) continue;
    const list = tagNamesByContact.get(row.contact_id) ?? [];
    list.push(row.tag.name);
    tagNamesByContact.set(row.contact_id, list);
  }

  const rows = contacts.map((c) => ({
    id: c.id,
    nome: c.name,
    email: c.email,
    telefone: c.phone,
    origem: c.lead_source,
    empresa: c.company?.name ?? null,
    vendedor: c.owner?.full_name ?? null,
    tags: (tagNamesByContact.get(c.id) ?? []).join(", "),
    criado_em: c.created_at,
  }));

  return NextResponse.json(rows);
}
