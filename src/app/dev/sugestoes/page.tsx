import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { SuggestionsManager } from "@/components/dev/SuggestionsManager";
import type { Database } from "@/types/database.types";

export default async function DevSugestoesPage() {
  const admin = createAdminClient();
  const { data: suggestions } = await admin
    .from("suggestions")
    .select<Database["public"]["Tables"]["suggestions"]["Row"] & { tenant: { name: string } | null }>(
      "*, tenant:tenants(name)",
    )
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Sugestões</h1>
        <p className="mt-1 text-sm text-gray-500">Mandadas pelos times de todos os CRMs.</p>
      </div>

      <Card className="divide-y divide-gray-100 overflow-hidden">
        <SuggestionsManager suggestions={suggestions ?? []} />
      </Card>
    </div>
  );
}
