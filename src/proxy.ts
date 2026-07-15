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
     */
    "/((?!_next/static|_next/image|favicon.ico|api/whatsapp/webhook/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
