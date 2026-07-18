import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Mesmo gate de /app/download, mas manda direto pra versão web em vez de baixar um APK. */
export default async function AppWebRedirectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: hasAccess } = await supabase.rpc("current_tenant_has_transportadora");
  if (!hasAccess) redirect("/comprar-transportadora");

  redirect("/app-web/");
}
