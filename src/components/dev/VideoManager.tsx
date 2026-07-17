"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { createTutorialVideo, deleteTutorialVideo, type ActionState } from "@/lib/actions/platform-videos";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import type { PlatformTutorialVideo } from "@/types/domain";

export function VideoManager({ videos }: { videos: PlatformTutorialVideo[] }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(createTutorialVideo, null);
  const [isDeleting, startDelete] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
      router.refresh();
    }
    wasPending.current = isPending;
  }, [isPending, state, router]);

  function handleDelete(videoId: string) {
    startDelete(async () => {
      const result = await deleteTutorialVideo(videoId);
      if (result?.error) toast.error(result.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {videos.length > 0 && (
        <ul className="space-y-2">
          {videos.map((video) => (
            <li
              key={video.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{video.title}</p>
                {video.description && <p className="mt-0.5 text-xs text-gray-500">{video.description}</p>}
                <a
                  href={video.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 block truncate text-xs text-indigo-600 hover:underline"
                >
                  {video.video_url}
                </a>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(video.id)}
                disabled={isDeleting}
                aria-label={`Remover vídeo ${video.title}`}
                className="shrink-0 text-gray-400 hover:text-red-600"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={formAction} className="space-y-3 border-t border-gray-100 pt-5">
        <div>
          <Label htmlFor="title">Título</Label>
          <Input id="title" name="title" required placeholder="Como conectar o WhatsApp" />
        </div>
        <div>
          <Label htmlFor="videoUrl">URL do vídeo (YouTube, etc)</Label>
          <Input id="videoUrl" name="videoUrl" required placeholder="https://youtube.com/watch?v=..." />
        </div>
        <div>
          <Label htmlFor="description">Descrição (opcional)</Label>
          <Textarea id="description" name="description" rows={2} />
        </div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <Button type="submit" size="sm" isLoading={isPending}>
          <Plus size={14} />
          Adicionar vídeo
        </Button>
      </form>
    </div>
  );
}
