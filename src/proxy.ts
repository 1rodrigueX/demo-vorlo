import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - static assets, image optimization, favicon
     * - the Twilio webhook (no user session; authenticated via signature instead)
     * - webhooks under api/webhooks/ (ex: Stripe — autenticado via assinatura, sem sessão)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/whatsapp/webhook/|api/webhooks/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
