import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBaileysState } from "@/lib/whatsapp/baileysClient";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const state = getBaileysState();

  return NextResponse.json({
    status: state.status,
    qrDataUrl: state.status === "qr" ? state.qrDataUrl : null,
    phoneNumber: state.status === "connected" ? state.phoneNumber : null,
  });
}
