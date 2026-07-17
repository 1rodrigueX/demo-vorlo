import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantId } from "@/lib/auth/current-user";
import { exchangeBlingCode } from "@/lib/bling/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  // Sempre usa NEXT_PUBLIC_SITE_URL, nunca o origin da requisição — atrás do
  // Nginx, request.url reflete o bind interno (localhost:3000), não o host
  // público, e isso quebrava o redirect de volta pro usuário.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("bling_oauth_state")?.value;
  const connectionId = cookieStore.get("bling_oauth_connection_id")?.value;

  if (!code || !state || !expectedState || state !== expectedState || !connectionId) {
    return NextResponse.redirect(`${siteUrl}/settings?bling=error`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) {
    return NextResponse.redirect(`${siteUrl}/settings?bling=error`);
  }

  // Confere de novo que a conexão é deste tenant antes de gravar o token.
  const { data: connection } = await supabase
    .from("bling_connections")
    .select("id")
    .eq("id", connectionId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!connection) {
    return NextResponse.redirect(`${siteUrl}/settings?bling=error`);
  }

  try {
    const token = await exchangeBlingCode(connectionId, code);
    const admin = createAdminClient();
    await admin
      .from("bling_connections")
      .update({
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);
  } catch (err) {
    console.error("Bling: falha ao trocar código por token", err);
    return NextResponse.redirect(`${siteUrl}/settings?bling=error`);
  }

  const response = NextResponse.redirect(`${siteUrl}/settings?bling=connected`);
  response.cookies.delete("bling_oauth_state");
  response.cookies.delete("bling_oauth_connection_id");
  return response;
}
