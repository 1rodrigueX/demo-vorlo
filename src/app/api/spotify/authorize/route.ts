import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getSpotifyAuthorizeUrl } from "@/lib/spotify/client";

export async function GET() {
  // Sempre usa NEXT_PUBLIC_SITE_URL, nunca o origin da requisição — atrás do
  // Nginx, request.url reflete o bind interno, não o host público.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${siteUrl}/login`);

  const redirectUri = `${siteUrl}/api/spotify/callback`;
  const state = randomBytes(16).toString("hex");

  const authorizeUrl = getSpotifyAuthorizeUrl(state, redirectUri);
  if (!authorizeUrl) return NextResponse.redirect(`${siteUrl}/musica?spotify=not_configured`);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("spotify_oauth_state", state, {
    httpOnly: true,
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
