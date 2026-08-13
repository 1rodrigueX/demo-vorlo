import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";

// Instância só-edge do Auth.js (config base, sem providers de Node): o wrapper
// `auth` lê a sessão do JWT sem tocar no banco. No lugar do updateSession do
// Supabase.
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/reset-password",
  "/auth", // /auth/callback (pós-Google) e /auth/confirm (e-mail) resolvem sozinhos
  "/api/auth", // handler do Auth.js (login, callback do Google)
  "/compra",
  // Site institucional público VORLO (agência) + página do produto CRM.
  "/orcamento",
  "/portfolio",
  "/sobre",
  "/produtos",
  "/seguranca",
  "/crm",
  // Instalador do app desktop (público — baixar não exige login).
  "/downloads",
];

export const proxy = auth((request) => {
  const isLoggedIn = !!request.auth?.user;
  const path = request.nextUrl.pathname;
  const isPublicPath = path === "/" || PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!isLoggedIn && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Já logado tentando ver login/cadastro: manda pro resolvedor pós-login, que
  // decide central/CRM/dev (sem consultar banco aqui no edge).
  if (isLoggedIn && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Todas as rotas, exceto:
     * - assets estáticos, imagem, favicon, robots.txt
     * - handler do Auth.js (api/auth/) — precisa passar direto
     * - webhook do Twilio, api/webhooks/, api/cron/, api/public/, api/discord/
     *   (autenticados por assinatura/segredo/token, sem cookie de sessão)
     * - app-web (build Flutter estático, com login próprio)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/auth/|api/whatsapp/webhook/|api/webhooks/|api/cron/|api/public/|api/discord/|app-web|.*\\.(?:svg|png|jpg|jpeg|gif|webp|apk)$).*)",
  ],
};
