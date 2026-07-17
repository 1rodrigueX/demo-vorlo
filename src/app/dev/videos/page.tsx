import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { VideoManager } from "@/components/dev/VideoManager";

export default async function DevVideosPage() {
  const admin = createAdminClient();
  const { data: videos } = await admin
    .from("platform_tutorial_videos")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Vídeos de tutorial</h1>
        <p className="mt-1 text-sm text-gray-500">
          Aparecem pra todos os CRMs em Suporte → Vídeos.
        </p>
      </div>

      <Card className="p-6">
        <VideoManager videos={videos ?? []} />
      </Card>
    </div>
  );
}
