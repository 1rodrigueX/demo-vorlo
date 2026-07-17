import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { PlatformFeedbackManager } from "@/components/dev/PlatformFeedbackManager";

export default async function DevFeedbackPage() {
  const admin = createAdminClient();
  const { data: feedback } = await admin
    .from("platform_feedback")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Feedback de visitantes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Mandado antes de assinar, na aba Feedback da tela pós-cadastro.
        </p>
      </div>

      <Card className="divide-y divide-gray-100 overflow-hidden">
        <PlatformFeedbackManager feedback={feedback ?? []} />
      </Card>
    </div>
  );
}
