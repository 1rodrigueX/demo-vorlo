import { listTutorialVideos } from "@/lib/actions/platform-videos";
import { Card } from "@/components/ui/Card";

function toEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com") && parsed.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${parsed.searchParams.get("v")}`;
    }
    if (parsed.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${parsed.pathname}`;
    }
    return null;
  } catch {
    return null;
  }
}

export default async function SuporteVideosPage() {
  const videos = await listTutorialVideos();

  if (!videos.length) {
    return <p className="text-sm text-gray-500">Nenhum vídeo publicado ainda.</p>;
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-y-auto pb-4 sm:grid-cols-2">
      {videos.map((video) => {
        const embedUrl = toEmbedUrl(video.video_url);
        return (
          <Card key={video.id} className="overflow-hidden p-0">
            {embedUrl ? (
              <div className="aspect-video w-full">
                <iframe
                  src={embedUrl}
                  title={video.title}
                  className="h-full w-full"
                  allowFullScreen
                />
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
