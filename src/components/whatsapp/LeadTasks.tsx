"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, CalendarClock } from "lucide-react";
import { getLeadTasks, createLeadTask, toggleLeadTask, deleteLeadTask } from "@/lib/actions/lead-tasks";
import { cn } from "@/lib/utils/cn";
import type { LeadTask } from "@/types/domain";

/** Tarefas do lead — checkbox, prazo opcional, criar/concluir/excluir. Após
 * cada mutação recarrega via getLeadTasks (server action) pra manter simples. */
export function LeadTasks({ contactId, initialTasks }: { contactId: string; initialTasks: LeadTask[] }) {
  const [tasks, setTasks] = useState<LeadTask[]>(initialTasks);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => setTasks(await getLeadTasks(contactId)));
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    startTransition(async () => {
      const res = await createLeadTask({ contactId, title: t, dueAt: due || null });
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      setTitle("");
      setDue("");
      refresh();
    });
  }

  function handleToggle(task: LeadTask) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)));
    startTransition(async () => {
      const res = await toggleLeadTask(task.id, !task.done);
      if (res?.error) {
        toast.error(res.error);
        refresh();
      }
    });
  }

  function handleDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    startTransition(async () => {
      const res = await deleteLeadTask(id);
      if (res?.error) {
        toast.error(res.error);
        refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleAdd} className="space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nova tarefa..."
          className="w-full rounded-lg border border-gray-300 bg-panel px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex items-center gap-2">
          <input
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-panel px-2 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={pending || !title.trim()}
            style={{ background: "linear-gradient(135deg,#ff7a4d,#ff5722)" }}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
          >
            <Plus size={13} /> Add
          </button>
        </div>
      </form>

      {tasks.length === 0 ? (
        <p className="py-4 text-center text-xs text-gray-400">Nenhuma tarefa ainda.</p>
      ) : (
        <ul className="space-y-1.5">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="group flex items-start gap-2 rounded-lg border border-gray-200 bg-panel px-2.5 py-2"
            >
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => handleToggle(task)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600"
              />
              <div className="min-w-0 flex-1">
                <p className={cn("text-xs", task.done ? "text-gray-400 line-through" : "text-gray-800")}>
                  {task.title}
                </p>
                {task.due_at && (
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-400">
                    <CalendarClock size={10} />
                    {new Date(task.due_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(task.id)}
                className="shrink-0 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                aria-label="Excluir tarefa"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
