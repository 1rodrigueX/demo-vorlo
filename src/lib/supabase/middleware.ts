import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveHomeRouteFor } from "@/lib/auth/current-user";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/auth/callback",
  "/compra",
  // Site institucional público SYNEXA (agência) + página do produto CRM.
  "/orcamento",
  "/portfolio",
  "/sobre",
  "/produtos",
  "/seguranca",
  "/crm",
  // Instalador do app desktop (público — baixar não exige login).
  "/downloads",
];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() revalidates the token against the Auth server.
  // Never use getSession() here — it only reads the (possibly stale) cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublicPath = path === "/" || PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    // Sessão pode estar "logada" (aal1) sem ainda ter passado pelo segundo
    // fator de quem tem MFA ativado — sem essa checagem, bastaria a senha
    // pra navegar direto pra qualquer rota digitando a URL.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const needsMfaChallenge = !!aal && aal.nextLevel === "aal2" && aal.currentLevel !== aal.nextLevel;

    if (path === "/login" || path === "/signup") {
      const url = request.nextUrl.clone();
      url.pathname = await resolveHomeRouteFor(supabase, user.id);
      return NextResponse.redirect(url);
    }

    if (needsMfaChallenge && path !== "/mfa-challenge") {
      const url = request.nextUrl.clone();
      url.pathname = "/mfa-challenge";
      return NextResponse.redirect(url);
    }

    if (!needsMfaChallenge && path === "/mfa-challenge") {
      const url = request.nextUrl.clone();
      url.pathname = await resolveHomeRouteFor(supabase, user.id);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
