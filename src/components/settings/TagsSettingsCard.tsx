"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createTag, deleteTag, type ActionState } from "@/lib/actions/tags";
import type { Tag } from "@/types/domain";

export function TagsSettingsCard({ tags }: { tags: Tag[] }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createTag, null);
  const [isDeleting, startDelete] = useTransition();
  const router = useRouter();

  function handleDelete(tagId: string) {
    startDelete(async () => {
      await deleteTag(tagId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Use tags pra organizar seus contatos (ex: filiais, segmentos) — uma tag também pode ser
        vinculada a uma conta Bling específica, pra rotear a sincronização certinha.
      </p>

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              type="button"
              onClick={() => handleDelete(tag.id)}
              disabled={isDeleting}
              aria-label={`Remover tag ${tag.name}`}
              className="hover:opacity-75"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {!tags.length && <p className="text-sm text-gray-500">Nenhuma tag criada ainda.</p>}
      </div>

      <form action={formAction} className="flex items-end gap-2">
        <div className="flex-1">
          <Input name="name" placeholder="Nome da tag (ex: Filial SP)" required />
        </div>
        <input
          type="color"
          name="color"
          defaultValue="#6366f1"
          className="h-10 w-12 shrink-0 rounded-md border border-gray-300"
          aria-label="Cor da tag"
        />
        <Button type="submit" variant="secondary" size="sm" isLoading={isPending}>
          Adicionar
        </Button>
      </form>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
