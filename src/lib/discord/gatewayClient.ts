import "server-only";
import { Client, GatewayIntentBits } from "discord.js";
import { getDiscordConfig } from "./config";

type GatewayState = { client: Client | null; connecting: boolean };

// Mesmo padrão do baileysClient.ts: uma conexão persistente guardada em
// globalThis, sobrevivendo entre requests dentro do mesmo processo PM2 —
// só existe presença "online" de verdade com o Gateway do Discord mantido
// aberto (diferente de mandar mensagem/responder slash command, que é só
// REST/webhook e não precisa disso).
const globalForDiscord = globalThis as unknown as { __discordGateway?: GatewayState };
const state: GatewayState = globalForDiscord.__discordGateway ?? { client: null, connecting: false };
globalForDiscord.__discordGateway = state;

export async function ensureDiscordGatewayConnected(): Promise<void> {
  if (state.client || state.connecting) return;

  const config = await getDiscordConfig();
  if (!config.botToken) return;

  state.connecting = true;
  try {
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });

    client.once("ready", () => {
      console.log(`discord gateway: conectado como ${client.user?.tag}`);
    });
    client.on("error", (err) => {
      console.error("discord gateway: erro na conexão", err);
    });

    await client.login(config.botToken);
    state.client = client;
  } catch (err) {
    console.error("discord gateway: falha ao conectar", err);
    state.client = null;
  } finally {
    state.connecting = false;
  }
}

/** Chamado depois de salvar um token novo em /dev/discord — derruba a conexão antiga (se tinha) e sobe com o token atual. */
export async function reconnectDiscordGateway(): Promise<void> {
  if (state.client) {
    await state.client.destroy().catch(() => {});
    state.client = null;
  }
  await ensureDiscordGatewayConnected();
}

export function isDiscordGatewayConnected(): boolean {
  return !!state.client?.isReady();
}
