import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Mesmo gate de /app/download, mas manda direto pra versão web em vez de baixar um APK. */
export default async function AppWebRedirectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: hasAccess } = await supabase.rpc("current_tenant_has_transportadora", { p_user_id: user.id });
  if (!hasAccess) redirect("/comprar-transportadora");

  // Next.js só serve arquivos exatos de public/ — não resolve "/app-web/"
  // pra "/app-web/index.html" sozinho como um servidor de arquivos comum.
  redirect("/app-web/index.html");
}
