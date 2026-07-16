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

  const { data: plans } = await supabase.from("billing_plans").select("*").order("base_price_cents");

  return <LandingPage plans={plans ?? []} />;
}
