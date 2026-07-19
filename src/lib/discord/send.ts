import "server-only";
import { getDiscordConfig } from "./config";

const DISCORD_API = "https://discord.com/api/v10";

export type DiscordEmbed = {
  title: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
};

export type SendResult = { ok: true } | { ok: false; error: string };

/**
 * Envia um embed pro canal de log do Discord via REST — não precisa do bot
 * "online" (Gateway) pra isso, só o token. Nunca lança (só retorna
 * ok:false): se ainda não tiver sido configurado em /dev/discord, ou se a
 * chamada falhar, uma notificação não pode derrubar o fluxo principal
 * (criar tenant, salvar feedback etc) — quem chama em fire-and-forget
 * (void sendDiscordMessage(...)) simplesmente ignora o retorno; o botão de
 * teste em /dev/discord é que realmente usa o resultado.
 */
export async function sendDiscordMessage(embed: DiscordEmbed, channelId?: string): Promise<SendResult> {
  const config = await getDiscordConfig();
  const targetChannel = channelId ?? config.logChannelId;
  if (!config.botToken || !targetChannel) {
    return { ok: false, error: "Bot não configurado (token ou canal faltando)" };
  }

  try {
    const res = await fetch(`${DISCORD_API}/channels/${targetChannel}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${config.botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ embeds: [{ ...embed, timestamp: new Date().toISOString() }] }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("discord/send: resposta não-ok", res.status, detail);
      return { ok: false, error: `Discord respondeu ${res.status}: ${detail.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro desconhecido";
    console.error("discord/send: falha ao enviar mensagem", err);
    return { ok: false, error: message };
  }
}
