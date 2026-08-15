import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId, getTenantSlug } from "@/lib/auth/current-user";
import { exchangeOAuthCode } from "@/lib/integrations/oauth";
import { isOAuthProviderKey } from "@/lib/integrations/providers";

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const { searchParams } = new URL(request.url);
  // Sempre usa NEXT_PUBLIC_SITE_URL, nunca o origin da requisição — atrás do
  // Nginx, request.url reflete o bind interno (o bind interno do servidor), não o host
  // público, e isso quebrava o redirect de volta pro usuário.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(`${provider}_oauth_state`)?.value;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  const tenantId = await requireTenantId(supabase, user.id);
  const slug = tenantId ? await getTenantSlug(supabase, tenantId) : null;
  if (!tenantId || !slug) {
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  if (!isOAuthProviderKey(provider)) {
    return NextResponse.redirect(`${siteUrl}/${slug}/settings/integracoes?integration=error`);
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${siteUrl}/${slug}/settings/integracoes?integration=error&provider=${provider}`);
  }

  const redirectUri = `${siteUrl}/api/integrations/${provider}/callback`;

  try {
    await exchangeOAuthCode(provider, tenantId, code, redirectUri);
  } catch (err) {
    console.error(`${provider}: falha ao trocar código por token`, err);
    return NextResponse.redirect(`${siteUrl}/${slug}/settings/integracoes?integration=error&provider=${provider}`);
  }

  const response = NextResponse.redirect(
    `${siteUrl}/${slug}/settings/integracoes?integration=connected&provider=${provider}`,
  );
  response.cookies.delete(`${provider}_oauth_state`);
  return response;
}
