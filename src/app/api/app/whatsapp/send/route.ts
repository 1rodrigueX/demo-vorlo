import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";

// Endpoint pro app desktop nativo enviar WhatsApp. Operação privilegiada
// (Twilio/Baileys) que não pode sair do servidor — o app chama aqui passando o
// JWT do usuário no header Authorization. CORS liberado porque a segurança é o
// token (Bearer), não a origem, e não usamos cookies.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Não autorizado" }, { status: 401, headers: CORS });

  // Cliente com o token do usuário: valida a sessão e aplica RLS nas leituras.
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão inválida" }, { status: 401, headers: CORS });

  const body = (await request.json().catch(() => null)) as { contactId?: string; message?: string } | null;
  const contactId = body?.contactId;
  const message = (body?.message ?? "").trim();
  if (!contactId || !message) {
    return NextResponse.json({ error: "Informe contato e mensagem" }, { status: 400, headers: CORS });
  }

  const { data: profile } = await sb.from("profiles").select("tenant_id").eq("id", user.id).maybeSingle();
  const tenantId = profile?.tenant_id;
  if (!tenantId) return NextResponse.json({ error: "Tenant não encontrado" }, { status: 403, headers: CORS });

  // RLS já garante que o contato é do tenant do usuário; ainda pegamos o telefone.
  const { data: contact } = await sb.from("contacts").select("id, phone").eq("id", contactId).maybeSingle();
  if (!contact?.phone) {
    return NextResponse.json({ error: "Contato sem telefone" }, { status: 400, headers: CORS });
  }

  const admin = createAdminClient();
  try {
    const result = await sendWhatsAppMessage(tenantId, contact.phone, message);
    const { data: wa } = await admin
      .from("whatsapp_messages")
      .insert({
        tenant_id: tenantId,
        contact_id: contactId,
        twilio_sid: result.externalId,
        direction: "outbound",
        from_number: result.from,
        to_number: result.to,
        body: message,
        status: result.initialStatus,
        sent_by: user.id,
      })
      .select("id")
      .single();

    await admin.from("activities").insert({
      tenant_id: tenantId,
      contact_id: contactId,
      type: "whatsapp",
      direction: "outbound",
      body: message,
      created_by: user.id,
      whatsapp_message_id: wa?.id ?? null,
    });

    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro desconhecido";
    return NextResponse.json({ error: `Falha ao enviar: ${msg}` }, { status: 500, headers: CORS });
  }
}
