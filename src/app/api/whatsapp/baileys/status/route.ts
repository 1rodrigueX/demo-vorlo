import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { getBaileysState, startBaileysConnection } from "@/lib/whatsapp/baileysClient";

export async function GET() {
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

  const state = getBaileysState(tenantId);

  // Início "preguiçoso": se ninguém iniciou essa conexão ainda (ex: tenant
  // acabou de trocar pra Baileys nas Configurações), começa sozinho ao
  // primeiro poll da tela de WhatsApp.
  if (!state.sock && !state.starting) {
    void startBaileysConnection(tenantId);
  }

  return NextResponse.json({
    status: state.status,
    qrDataUrl: state.status === "qr" ? state.qrDataUrl : null,
    phoneNumber: state.status === "connected" ? state.phoneNumber : null,
  });
}
