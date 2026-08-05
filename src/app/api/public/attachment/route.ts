import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMessageAttachmentSignedUrl } from "@/lib/storage/messageAttachments";

// Devolve uma URL assinada (temporária) de um anexo de mensagem, pro app
// desktop renderizar imagem/áudio/documento. Auth por JWT (Bearer); confere que
// o caminho pertence ao tenant do usuário (os anexos ficam em tenantId/...).
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

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão inválida" }, { status: 401, headers: CORS });

  const { data: profile } = await sb.from("profiles").select("tenant_id").eq("id", user.id).maybeSingle();
  const tenantId = profile?.tenant_id;
  if (!tenantId) return NextResponse.json({ error: "Tenant não encontrado" }, { status: 403, headers: CORS });

  const body = (await request.json().catch(() => null)) as { storagePath?: string } | null;
  const storagePath = body?.storagePath ?? "";
  // Os anexos são salvos em `${tenantId}/${contactId}/...` — só libera os do tenant.
  if (!storagePath || !storagePath.startsWith(`${tenantId}/`)) {
    return NextResponse.json({ error: "Anexo inválido" }, { status: 400, headers: CORS });
  }

  const url = await getMessageAttachmentSignedUrl(storagePath, 3600);
  if (!url) return NextResponse.json({ error: "Não foi possível gerar o link" }, { status: 500, headers: CORS });

  return NextResponse.json({ url }, { headers: CORS });
}
