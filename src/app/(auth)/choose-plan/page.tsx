import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserDev } from "@/lib/auth/current-user";
import { ChoosePlanForm } from "@/components/billing/ChoosePlanForm";

const STALE_CHECKOUT_MS = 30 * 60 * 1000;

export default async function ChoosePlanPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (profile) redirect("/dashboard");

  if (await isCurrentUserDev()) redirect("/dev");

  const admin = createAdminClient();

  // pending_checkouts é service-role only (sem policy) — precisa do admin client mesmo pro próprio usuário.
  const staleThreshold = new Date(Date.now() - STALE_CHECKOUT_MS).toISOString();
  await admin
    .from("pending_checkouts")
    .delete()
    .eq("user_id", user.id)
    .eq("status", "pending")
    .lt("created_at", staleThreshold);

  const { data: activeCheckout } = await admin
    .from("pending_checkouts")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  const { data: plans } = await supabase.from("billing_plans").select("*").order("base_price_cents");
  const { plan: preselectedPlanId } = await searchParams;

  return (
    <ChoosePlanForm
      plans={plans ?? []}
      preselectedPlanId={preselectedPlanId}
      hasActiveCheckout={!!activeCheckout}
      ownerName={(user.user_metadata?.full_name as string | undefined) ?? null}
    />
  );
}
