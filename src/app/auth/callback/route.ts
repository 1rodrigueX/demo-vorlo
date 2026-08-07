import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient, type SessionClient } from "@/lib/supabase/server";
import { resolveHomeRouteFor } from "@/lib/auth/current-user";

/**
 * Aterrissagem pós-login do Google. O Auth.js já processou o OAuth no próprio
 * callback (/api/auth/callback/google) e estabeleceu a sessão; aqui só
 * resolvemos pra onde mandar o usuário (central/CRM/dev), já autenticado.
 *
 * Sempre usa NEXT_PUBLIC_SITE_URL: atrás do Nginx, request.url reflete o bind
 * interno, não o host público.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(`${siteUrl}/login?error=auth`);

  if (next && next.startsWith("/") && !next.startsWith("//") && next !== "/dashboard") {
    return NextResponse.redirect(`${siteUrl}${next}`);
  }

  const supabase = await createClient();
  const home = await resolveHomeRouteFor(supabase as SessionClient, session.user.id);
  return NextResponse.redirect(`${siteUrl}${home}`);
}
