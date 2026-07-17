import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  // Sempre usa NEXT_PUBLIC_SITE_URL, nunca o origin da requisição — atrás do
  // Nginx, request.url reflete o bind interno (localhost:3000), não o host
  // público, e isso mandava o login com Google de volta pro localhost.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${siteUrl}${next}`);
    }
  }

  return NextResponse.redirect(`${siteUrl}/login?error=auth`);
}
