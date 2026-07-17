import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveHomeRouteFor } from "@/lib/auth/current-user";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  // Sempre usa NEXT_PUBLIC_SITE_URL, nunca o origin da requisição — atrás do
  // Nginx, request.url reflete o bind interno (45.149.153.20), não o host
  // público, e isso mandava o login com Google de volta pro localhost.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // "/dashboard" é um sentinel de "me leva pro meu CRM" — o slug do
      // tenant só existe depois de autenticado, então resolve aqui em vez
      // de confiar num "next" literal (que não pode saber o slug de antemão).
      if (next === "/dashboard") {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const homeRoute = user ? await resolveHomeRouteFor(supabase, user.id) : "/login";
        return NextResponse.redirect(`${siteUrl}${homeRoute}`);
      }
      return NextResponse.redirect(`${siteUrl}${next}`);
    }
  }

  return NextResponse.redirect(`${siteUrl}/login?error=auth`);
}
