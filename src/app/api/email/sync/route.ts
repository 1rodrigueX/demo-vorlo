import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { syncEmailMessages } from "@/lib/email/sync";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant não encontrado" }, { status: 400 });
  }

  try {
    const result = await syncEmailMessages(tenantId);
    return NextResponse.json({ ok: true, synced: result.synced });
  } catch (err) {
    console.error("email sync failed:", err);
    return NextResponse.json({ error: "Falha ao sincronizar e-mails" }, { status: 500 });
  }
}
