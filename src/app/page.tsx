import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveHomeRoute } from "@/lib/auth/current-user";
import { LandingPage } from "@/components/marketing/LandingPage";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(await resolveHomeRoute());
  }

  const { data: plan } = await supabase.from("billing_plans").select("*").eq("is_default", true).maybeSingle();

  return <LandingPage plan={plan ?? null} />;
}
