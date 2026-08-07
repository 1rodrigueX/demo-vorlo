import { createClient } from "@/lib/supabase/server";
import { PlatformUpdatesManager, type UpdateItem } from "@/components/dev/PlatformUpdatesManager";
import { AppReleasesCard, type ReleaseItem } from "@/components/dev/AppReleasesCard";

export default async function DevAtualizacoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // O layout de /dev já barra quem não é dev — aqui só carrega os dados.
  const [{ data: updates }, { data: releases }] = await Promise.all([
    supabase
      .from("platform_updates")
      .select("id, title, version, body, status, recipients_total, recipients_sent, recipients_failed, error, created_at, sent_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("app_releases")
      .select("id, version, url, notes, is_published, published_at")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <PlatformUpdatesManager updates={(updates ?? []) as UpdateItem[]} devEmail={user?.email ?? ""} />
      <AppReleasesCard releases={(releases ?? []) as ReleaseItem[]} />
    </div>
  );
}
