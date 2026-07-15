import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMessageAttachmentSignedUrl } from "@/lib/storage/messageAttachments";

export async function GET(_request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // RLS de whatsapp_messages já garante que só vem de volta se o usuário
  // puder ver essa mensagem (dono do contato ou admin do tenant).
  const { data: message } = await supabase
    .from("whatsapp_messages")
    .select("media_storage_path")
    .eq("id", messageId)
    .maybeSingle();

  if (!message?.media_storage_path) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const url = await getMessageAttachmentSignedUrl(message.media_storage_path);
  if (!url) return NextResponse.json({ error: "failed" }, { status: 500 });

  return NextResponse.json({ url });
}
