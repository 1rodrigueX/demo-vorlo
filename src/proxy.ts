import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - static assets, image optimization, favicon, robots.txt
     * - the Twilio webhook (no user session; authenticated via signature instead)
     * - webhooks under api/webhooks/ (ex: Mercado Pago — autenticado via assinatura, sem sessão)
     * - api/cron/ (autenticado via segredo compartilhado, chamado pelo crontab da VPS)
     * - api/public/ (ex: captura de lead por webhook externo — autenticado
     *   pelo token no próprio path, chamado por um servidor de fora sem
     *   cookie de sessão nenhum)
     * - api/discord/ (Interactions Endpoint do bot — autenticado por
     *   assinatura ed25519 própria, chamado direto pelo Discord sem sessão)
     * - .apk em public/downloads/ (o APK do app Transportadora — o gate de
     *   acesso já acontece na página /app/download antes de linkar pra cá,
     *   não faz sentido o middleware also exigir sessão pro arquivo em si)
     * - app-web (build web do app Transportadora, servido como estático —
     *   tem login e checagem de assinatura próprios dentro do próprio app
     *   Flutter, mesmo raciocínio do .apk acima). Sem barra no final do
     *   padrão: "/app-web" (sem conteúdo depois) também precisa passar,
     *   senão o Next normaliza "/app-web/" pra "/app-web" e isso volta a
     *   cair no gate de sessão.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|api/whatsapp/webhook/|api/webhooks/|api/cron/|api/public/|api/discord/|app-web|.*\\.(?:svg|png|jpg|jpeg|gif|webp|apk)$).*)",
  ],
};
