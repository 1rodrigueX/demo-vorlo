import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type DiscordConfig = {
  botToken: string | null;
  publicKey: string | null;
  applicationId: string | null;
  logChannelId: string | null;
};

/** Config do bot vem do banco agora (editável em /dev/discord), não mais de env var. */
export async function getDiscordConfig(): Promise<DiscordConfig> {
  const admin = createAdminClient();
  const { data } = await admin.from("platform_discord_config").select("*").eq("id", true).maybeSingle();

  return {
    botToken: data?.bot_token ?? null,
    publicKey: data?.public_key ?? null,
    applicationId: data?.application_id ?? null,
    logChannelId: data?.log_channel_id ?? null,
  };
}
