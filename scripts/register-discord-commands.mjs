// Registra (ou atualiza) os slash commands do bot no Discord — roda uma vez
// depois de criar o app no Discord Developer Portal, e de novo sempre que
// mudar a lista de comandos abaixo. Precisa de DISCORD_BOT_TOKEN e
// DISCORD_APPLICATION_ID no ambiente (não fica no .env do app — só usado
// manualmente, aqui).
//
// Uso: DISCORD_BOT_TOKEN=... DISCORD_APPLICATION_ID=... node scripts/register-discord-commands.mjs

const token = process.env.DISCORD_BOT_TOKEN;
const appId = process.env.DISCORD_APPLICATION_ID;

if (!token || !appId) {
  console.error("Defina DISCORD_BOT_TOKEN e DISCORD_APPLICATION_ID antes de rodar.");
  process.exit(1);
}

const commands = [
  { name: "status", description: "Status geral da plataforma FALA AI" },
  { name: "stats", description: "Números detalhados (CRMs, Transportadoras, usuários, pendências)" },
];

const res = await fetch(`https://discord.com/api/v10/applications/${appId}/commands`, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(commands),
});

if (!res.ok) {
  console.error("Falha ao registrar comandos:", res.status, await res.text());
  process.exit(1);
}

console.log("Comandos registrados:", (await res.json()).map((c) => `/${c.name}`).join(", "));
