import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { getAuthorizeUrl } from "@/lib/integrations/oauth";
import { isOAuthProviderKey } from "@/lib/integrations/providers";

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const { origin } = new URL(request.url);

  if (!isOAuthProviderKey(provider)) {
    return NextResponse.redirect(`${origin}/settings?integration=error`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) {
    return NextResponse.redirect(`${origin}/settings?integration=error&provider=${provider}`);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
  const redirectUri = `${siteUrl}/api/integrations/${provider}/callback`;
  const state = randomBytes(16).toString("hex");

  const authorizeUrl = getAuthorizeUrl(provider, state, redirectUri);
  if (!authorizeUrl) {
    return NextResponse.redirect(`${origin}/settings?integration=not_configured&provider=${provider}`);
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
