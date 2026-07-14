import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";
import { whatsappSendSchema } from "@/lib/validation/activity";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = whatsappSendSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, phone")
    .eq("id", parsed.data.contactId)
    .single();

  if (!contact?.phone) {
    return NextResponse.json(
      { error: "Este contato não tem telefone cadastrado" },
      { status: 400 },
    );
  }

  try {
    const result = await sendWhatsAppMessage(contact.phone, parsed.data.message);

    const { data: waMessage, error: insertError } = await supabase
      .from("whatsapp_messages")
      .insert({
        contact_id: contact.id,
        twilio_sid: result.externalId,
        direction: "outbound",
        from_number: result.from,
        to_number: result.to,
        body: parsed.data.message,
        status: result.initialStatus,
        sent_by: user.id,
      })
      .select("*")
      .single();

    if (insertError || !waMessage) {
      return NextResponse.json(
        { error: "Mensagem enviada, mas não foi possível registrar no histórico" },
        { status: 500 },
      );
    }

    await supabase.from("activities").insert({
      contact_id: contact.id,
      type: "whatsapp",
      direction: "outbound",
      body: parsed.data.message,
      created_by: user.id,
      whatsapp_message_id: waMessage.id,
    });

    return NextResponse.json({ ok: true, message: waMessage });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao enviar";
    console.error("sendWhatsAppMessage failed:", err);

    await supabase.from("whatsapp_messages").insert({
      contact_id: contact.id,
      direction: "outbound",
      from_number: process.env.TWILIO_WHATSAPP_NUMBER ?? "",
      to_number: contact.phone,
      body: parsed.data.message,
      status: "failed",
      error_message: message,
      sent_by: user.id,
    });

    return NextResponse.json({ error: `Falha ao enviar mensagem: ${message}` }, { status: 502 });
  }
}
