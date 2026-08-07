import { createClient } from "@/lib/supabase/server";
import { PlatformUpdatesManager, type UpdateItem } from "@/components/dev/PlatformUpdatesManager";

export default async function DevAtualizacoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // O layout de /dev já barra quem não é dev — aqui só carrega os dados.
  const { data } = await supabase
    .from("platform_updates")
    .select("id, title, version, body, status, recipients_total, recipients_sent, recipients_failed, error, created_at, sent_at")
    .order("created_at", { ascending: false });

  return (
    <PlatformUpdatesManager
      updates={(data ?? []) as UpdateItem[]}
      devEmail={user?.email ?? ""}
    />
  );
}
