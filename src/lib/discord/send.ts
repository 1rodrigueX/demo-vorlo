import "server-only";

const DISCORD_API = "https://discord.com/api/v10";

export type DiscordEmbed = {
  title: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
};

/**
 * Envia um embed pro canal de log do Discord via REST — não precisa do bot
 * "online" (Gateway) pra isso, só o token. Nunca lança: se não tiver
 * DISCORD_BOT_TOKEN/DISCORD_LOG_CHANNEL_ID configurado ainda, ou se a chamada
 * falhar, só loga e segue — uma notificação não pode derrubar o fluxo
 * principal (criar tenant, salvar feedback etc).
 */
export async function sendDiscordMessage(embed: DiscordEmbed, channelId?: string): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const targetChannel = channelId ?? process.env.DISCORD_LOG_CHANNEL_ID;
  if (!token || !targetChannel) return;

  try {
    const res = await fetch(`${DISCORD_API}/channels/${targetChannel}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ embeds: [{ ...embed, timestamp: new Date().toISOString() }] }),
    });
    if (!res.ok) {
      console.error("discord/send: resposta não-ok", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("discord/send: falha ao enviar mensagem", err);
  }
}
