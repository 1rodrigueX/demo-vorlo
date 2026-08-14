import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { getMessageAttachmentSignedUrl } from "@/lib/storage/messageAttachments";

export async function GET(_request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: message } = await supabase
    .from("whatsapp_messages")
    .select("media_storage_path")
    .eq("id", messageId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!message?.media_storage_path) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const url = await getMessageAttachmentSignedUrl(message.media_storage_path);
  if (!url) return NextResponse.json({ error: "failed" }, { status: 500 });

  return NextResponse.json({ url });
}
