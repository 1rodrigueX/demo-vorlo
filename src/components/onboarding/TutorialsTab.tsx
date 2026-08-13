import { Card } from "@/components/ui/Card";
import { toEmbedUrl } from "@/lib/utils/video";
import type { PlatformTutorialVideo } from "@/types/domain";

export function TutorialsTab({ videos }: { videos: PlatformTutorialVideo[] }) {
  if (!videos.length) {
    return (
      <p className="py-12 text-center text-sm text-gray-500">
        Ainda estamos gravando os tutoriais em vídeo — assim que sua conta for liberada, o Vorlo já te ajuda com
        qualquer dúvida de como usar o CRM.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {videos.map((video) => {
        const embedUrl = toEmbedUrl(video.video_url);
        return (
          <Card key={video.id} className="overflow-hidden p-0">
            {embedUrl ? (
              <div className="aspect-video w-full">
                <iframe src={embedUrl} title={video.title} className="h-full w-full" allowFullScreen />
              </div>
            ) : (
              <a
                href={video.video_url}
                target="_blank"
                rel="noreferrer"
                className="flex aspect-video w-full items-center justify-center bg-gray-100 text-sm font-medium text-indigo-600 hover:underline"
              >
                Assistir ↗
              </a>
            )}
            <div className="p-4">
              <p className="text-sm font-medium text-gray-900">{video.title}</p>
              {video.description && <p className="mt-1 text-xs text-gray-500">{video.description}</p>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
