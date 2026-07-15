import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { getBlingAuthorizeUrl } from "@/lib/bling/client";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { origin } = new URL(request.url);

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) {
    return NextResponse.redirect(`${origin}/settings?bling=error`);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
  const redirectUri = `${siteUrl}/api/bling/callback`;
  const state = randomBytes(16).toString("hex");

  const authorizeUrl = await getBlingAuthorizeUrl(tenantId, state, redirectUri);
  if (!authorizeUrl) {
    return NextResponse.redirect(`${origin}/settings?bling=not_configured`);
  }

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("bling_oauth_state", state, {
    httpOnly: true,
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
