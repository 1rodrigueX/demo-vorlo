"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { setContactTags } from "@/lib/actions/tags";
import type { Tag } from "@/types/domain";

export function ContactTagPicker({
  contactId,
  allTags,
  selectedTagIds,
}: {
  contactId: string;
  allTags: Tag[];
  selectedTagIds: string[];
}) {
  const [selected, setSelected] = useState(new Set(selectedTagIds));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(tagId: string) {
    const next = new Set(selected);
    if (next.has(tagId)) next.delete(tagId);
    else next.add(tagId);
    setSelected(next);

    startTransition(async () => {
      const result = await setContactTags(contactId, [...next]);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (!allTags.length) {
    return <p className="text-xs text-gray-400">Nenhuma tag criada ainda (Configurações &gt; Tags).</p>;
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", isPending && "opacity-60")}>
      {allTags.map((tag) => {
        const isSelected = selected.has(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.id)}
            disabled={isPending}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              isSelected ? "text-white" : "border-gray-300 bg-panel text-gray-600 hover:bg-gray-50",
            )}
            style={isSelected ? { backgroundColor: tag.color, borderColor: tag.color } : undefined}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
