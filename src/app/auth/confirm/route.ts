import { NextResponse } from "next/server";
import { consumeAuthToken, updateUser } from "@/lib/auth/db";

/**
 * Confirma o e-mail do cadastro: consome o token (uso único) e marca o usuário
 * como verificado. Depois manda pro login já com o destino (plano) preservado.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const next = searchParams.get("next");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  if (!token) return NextResponse.redirect(`${siteUrl}/login?confirm=invalid`);

  const consumed = await consumeAuthToken(token, "email_verify");
  if (!consumed?.userId) return NextResponse.redirect(`${siteUrl}/login?confirm=expired`);

  await updateUser(consumed.userId, { emailVerified: true });

  const params = new URLSearchParams({ confirmed: "1" });
  if (next && next.startsWith("/") && !next.startsWith("//")) params.set("next", next);
  return NextResponse.redirect(`${siteUrl}/login?${params.toString()}`);
}
