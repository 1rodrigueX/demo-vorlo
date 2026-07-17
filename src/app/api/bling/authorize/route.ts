import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId, getTenantSlug } from "@/lib/auth/current-user";
import { getBlingAuthorizeUrl } from "@/lib/bling/client";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("connectionId");
  // Sempre usa NEXT_PUBLIC_SITE_URL, nunca o origin da requisição — atrás do
  // Nginx, request.url reflete o bind interno (45.149.153.20), não o host
  // público, e isso quebrava o redirect_uri enviado às integrações.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!user) {
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  const tenantId = await requireTenantId(supabase, user.id);
  const slug = tenantId ? await getTenantSlug(supabase, tenantId) : null;
  if (!tenantId || !slug) {
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  if (!connectionId) {
    return NextResponse.redirect(`${siteUrl}/${slug}/settings/integracoes?bling=error`);
  }

  // Confere, com o client comum (RLS), que essa conexão é mesmo deste tenant.
  const { data: connection } = await supabase
    .from("bling_connections")
    .select("id")
    .eq("id", connectionId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!connection) {
    return NextResponse.redirect(`${siteUrl}/${slug}/settings/integracoes?bling=error`);
  }

  const redirectUri = `${siteUrl}/api/bling/callback`;
  const state = randomBytes(16).toString("hex");

  const authorizeUrl = await getBlingAuthorizeUrl(connectionId, state, redirectUri);
  if (!authorizeUrl) {
    return NextResponse.redirect(`${siteUrl}/${slug}/settings/integracoes?bling=not_configured`);
  }

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("bling_oauth_state", state, {
    httpOnly: true,
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  });
  response.cookies.set("bling_oauth_connection_id", connectionId, {
    httpOnly: true,
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
