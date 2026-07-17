import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { exchangeSpotifyCode } from "@/lib/spotify/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("spotify_oauth_state")?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${siteUrl}/musica?spotify=error`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${siteUrl}/login`);

  try {
    const redirectUri = `${siteUrl}/api/spotify/callback`;
    await exchangeSpotifyCode(code, redirectUri, user.id);
  } catch (err) {
    console.error("Spotify: falha ao trocar código por token", err);
    return NextResponse.redirect(`${siteUrl}/musica?spotify=error`);
  }

  const response = NextResponse.redirect(`${siteUrl}/musica?spotify=connected`);
  response.cookies.delete("spotify_oauth_state");
  return response;
}
