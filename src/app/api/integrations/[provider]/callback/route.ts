import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { exchangeOAuthCode } from "@/lib/integrations/oauth";
import { isOAuthProviderKey } from "@/lib/integrations/providers";

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const { searchParams, origin } = new URL(request.url);

  if (!isOAuthProviderKey(provider)) {
    return NextResponse.redirect(`${origin}/settings?integration=error`);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(`${provider}_oauth_state`)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${origin}/settings?integration=error&provider=${provider}`);
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

  try {
    await exchangeOAuthCode(provider, tenantId, code, redirectUri);
  } catch (err) {
    console.error(`${provider}: falha ao trocar código por token`, err);
    return NextResponse.redirect(`${origin}/settings?integration=error&provider=${provider}`);
  }

  const response = NextResponse.redirect(`${origin}/settings?integration=connected&provider=${provider}`);
  response.cookies.delete(`${provider}_oauth_state`);
  return response;
}
