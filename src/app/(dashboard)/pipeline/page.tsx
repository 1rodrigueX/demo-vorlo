import { createClient } from "@/lib/supabase/server";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { DealFormModal } from "@/components/pipeline/DealFormModal";
import type { DealWithContact } from "@/types/domain";

export default async function PipelinePage() {
  const supabase = await createClient();

  const [{ data: stages }, { data: deals }, { data: contacts }] = await Promise.all([
    supabase.from("pipeline_stages").select("*").order("position"),
    supabase
      .from("deals")
      .select("*, contact:contacts(id, name, phone)")
      .order("position"),
    supabase.from("contacts").select("id, name").order("name"),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Pipeline</h1>
          <p className="mt-1 text-sm text-gray-500">Arraste os negócios entre os estágios.</p>
        </div>
        <DealFormModal stages={stages ?? []} contacts={contacts ?? []} />
      </div>

      <KanbanBoard stages={stages ?? []} initialDeals={(deals ?? []) as unknown as DealWithContact[]} />
    </div>
  );
}
