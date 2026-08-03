"use client";

import { useState } from "react";
import { Activity, ListTodo, StickyNote } from "lucide-react";
import { ContactTimeline, type TimelineEntry } from "@/components/contacts/ContactTimeline";
import { ActivityComposer } from "@/components/contacts/ActivityComposer";
import { LeadTasks } from "@/components/whatsapp/LeadTasks";
import { cn } from "@/lib/utils/cn";
import type { LeadTask } from "@/types/domain";

type Tab = "atividades" | "tarefas" | "notas";

const TABS: { key: Tab; label: string; icon: typeof Activity }[] = [
  { key: "atividades", label: "Atividades", icon: Activity },
  { key: "tarefas", label: "Tarefas", icon: ListTodo },
  { key: "notas", label: "Notas", icon: StickyNote },
];

/** Coluna direita do workspace de Leads: Atividades (timeline real) / Tarefas
 * (lead_tasks) / Notas (activities type=note). */
export function LeadSidePanel({
  contactId,
  entries,
  initialTasks,
}: {
  contactId: string;
  entries: TimelineEntry[];
  initialTasks: LeadTask[];
}) {
  const [tab, setTab] = useState<Tab>("atividades");
  const notes = entries.filter((e) => e.type === "note");

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-gray-200 p-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
              tab === key
                ? "bg-indigo-500/10 text-indigo-600"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-800",
            )}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "atividades" && <ContactTimeline entries={entries} />}
        {tab === "tarefas" && <LeadTasks contactId={contactId} initialTasks={initialTasks} />}
        {tab === "notas" && (
          <div className="space-y-4">
            <ActivityComposer contactId={contactId} />
            {notes.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-400">Nenhuma nota ainda.</p>
            ) : (
              <ContactTimeline entries={notes} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
