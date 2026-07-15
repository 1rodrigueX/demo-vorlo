import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { blingFetch } from "@/lib/bling/client";

type BlingVendedoresResponse = { data?: { id: number | string; nome?: string; contato?: { nome?: string } }[] };

/** Lista os vendedores cadastrados no Bling dessa conexão — usado pra mapear vendedor do CRM -> vendedor do Bling. */
export async function GET(_request: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  const { connectionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "owner" && profile?.role !== "manager") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { data: connection } = await supabase
    .from("bling_connections")
    .select("id")
    .eq("id", connectionId)
    .maybeSingle();
  if (!connection) return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 });

  try {
    const result = (await blingFetch(connectionId, "/vendedores?limite=100")) as BlingVendedoresResponse;
    const vendedores = (result.data ?? []).map((v) => ({
      id: String(v.id),
      nome: v.nome || v.contato?.nome || `Vendedor ${v.id}`,
    }));
    return NextResponse.json({ vendedores });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao buscar vendedores no Bling" },
      { status: 502 },
    );
  }
}
