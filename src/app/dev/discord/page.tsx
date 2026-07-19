import { getDiscordConfigForForm } from "@/lib/actions/discord-config";
import { DiscordConfigForm } from "@/components/dev/DiscordConfigForm";

export default async function DevDiscordPage() {
  const config = await getDiscordConfigForForm();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Bot do Discord</h1>
        <p className="mt-1 text-sm text-gray-500">
          Notificações de eventos (CRM novo, feedback, bugs) e os comandos /status e /stats.
        </p>
      </div>

      <DiscordConfigForm
        initial={
          config ?? { botToken: null, publicKey: null, applicationId: null, logChannelId: null }
        }
      />
    </div>
  );
}
