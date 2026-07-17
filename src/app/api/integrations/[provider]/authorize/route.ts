import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { getAuthorizeUrl } from "@/lib/integrations/oauth";
import { isOAuthProviderKey } from "@/lib/integrations/providers";

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  // Sempre usa NEXT_PUBLIC_SITE_URL, nunca o origin da requisição — atrás do
  // Nginx, request.url reflete o bind interno (45.149.153.20), não o host
  // público, e isso quebrava o redirect_uri enviado às integrações.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!isOAuthProviderKey(provider)) {
    return NextResponse.redirect(`${siteUrl}/settings/integracoes?integration=error`);
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
    return NextResponse.redirect(`${siteUrl}/settings/integracoes?integration=error&provider=${provider}`);
  }

  const redirectUri = `${siteUrl}/api/integrations/${provider}/callback`;
  const state = randomBytes(16).toString("hex");

  const authorizeUrl = getAuthorizeUrl(provider, state, redirectUri);
  if (!authorizeUrl) {
    return NextResponse.redirect(`${siteUrl}/settings/integracoes?integration=not_configured&provider=${provider}`);
  }

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(`${provider}_oauth_state`, state, {
    httpOnly: true,
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
