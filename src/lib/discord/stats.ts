import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getPlatformStats() {
  const admin = createAdminClient();

  const [
    { count: crmCount },
    { count: transportadoraCount },
    usersPage,
    { count: newSuggestions },
    { count: newFeedback },
    { count: newBugs },
    { count: failedJobs },
  ] = await Promise.all([
    admin.from("tenants").select("id", { count: "exact", head: true }).not("billing_plan_id", "is", null),
    admin
      .from("tenant_products")
      .select("tenant_id", { count: "exact", head: true })
      .eq("product", "transportadora")
      .eq("status", "active"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("suggestions").select("id", { count: "exact", head: true }).eq("status", "new"),
    admin.from("platform_feedback").select("id", { count: "exact", head: true }).eq("status", "new"),
    admin.from("bug_reports").select("id", { count: "exact", head: true }).eq("status", "new"),
    admin
      .from("automation_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  return {
    crmCount: crmCount ?? 0,
    transportadoraCount: transportadoraCount ?? 0,
    userCount: usersPage.data.users.length,
    newSuggestions: newSuggestions ?? 0,
    newFeedback: newFeedback ?? 0,
    newBugs: newBugs ?? 0,
    failedJobsLast24h: failedJobs ?? 0,
  };
}
