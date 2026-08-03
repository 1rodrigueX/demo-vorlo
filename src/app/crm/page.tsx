import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/marketing/LandingPage";

/** Página do produto CRM (antes era a home). O site institucional da SYNEXA
 * agora ocupa a "/"; o CRM é apresentado aqui e linkado pelo site/agência. */
export default async function CrmProductPage() {
  const supabase = await createClient();

  const [{ data: plans }, { data: transportadoraPlan }] = await Promise.all([
    supabase.from("billing_plans").select("*").order("base_price_cents"),
    supabase.from("transportadora_plans").select("monthly_price_cents").eq("is_default", true).maybeSingle(),
  ]);

  return <LandingPage plans={plans ?? []} transportadoraPriceCents={transportadoraPlan?.monthly_price_cents ?? null} />;
}
