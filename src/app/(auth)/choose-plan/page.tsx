import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserDev, resolveHomeRoute } from "@/lib/auth/current-user";
import { ActiveCheckoutNotice } from "@/components/billing/ChoosePlanForm";
import { OnboardingTabs } from "@/components/onboarding/OnboardingTabs";
import { listTutorialVideos } from "@/lib/actions/platform-videos";
import { UserMenu } from "@/components/layout/UserMenu";

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
  if (profile) redirect(await resolveHomeRoute());

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
  const ownerName = (user.user_metadata?.full_name as string | undefined) ?? null;
  const email = user.email ?? "";

  if (activeCheckout) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6">
        <header className="mx-auto flex max-w-4xl items-center justify-between pb-10">
          <span className="text-sm font-semibold text-gray-900">FALA AI CRM</span>
          <UserMenu name={ownerName || email || "Usuário"} email={email} />
        </header>
        <div className="flex items-center justify-center">
          <ActiveCheckoutNotice />
        </div>
      </div>
    );
  }

  const videos = await listTutorialVideos();

  return (
    <OnboardingTabs
      plans={plans ?? []}
      videos={videos}
      preselectedPlanId={preselectedPlanId}
      ownerName={ownerName}
      email={email}
    />
  );
}
