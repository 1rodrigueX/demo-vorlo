import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { getMessageAttachmentSignedUrl } from "@/lib/storage/messageAttachments";

export async function GET(request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;
  const { searchParams } = new URL(request.url);
  const index = Number(searchParams.get("index") ?? "0");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: message } = await supabase
    .from("email_messages")
    .select("attachments")
    .eq("id", messageId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const attachments = (message?.attachments as { storagePath: string }[] | null) ?? [];
  const attachment = attachments[index];
  if (!attachment?.storagePath) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const url = await getMessageAttachmentSignedUrl(attachment.storagePath);
  if (!url) return NextResponse.json({ error: "failed" }, { status: 500 });

  return NextResponse.json({ url });
}
