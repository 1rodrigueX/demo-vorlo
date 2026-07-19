import { getDiscordConfigForForm } from "@/lib/actions/discord-config";
import { isDiscordGatewayConnected } from "@/lib/discord/gatewayClient";
import { DiscordConfigForm } from "@/components/dev/DiscordConfigForm";
import { cn } from "@/lib/utils/cn";

export default async function DevDiscordPage() {
  const config = await getDiscordConfigForForm();
  const connected = isDiscordGatewayConnected();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Bot do Discord</h1>
          <p className="mt-1 text-sm text-gray-500">
            Notificações de eventos (CRM novo, feedback, bugs) e os comandos /status e /stats.
          </p>
        </div>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            connected ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-emerald-500" : "bg-gray-400")} />
          {connected ? "Online" : "Offline"}
        </span>
      </div>

      <DiscordConfigForm
        initial={
          config ?? { botToken: null, publicKey: null, applicationId: null, logChannelId: null }
        }
      />
    </div>
  );
}
