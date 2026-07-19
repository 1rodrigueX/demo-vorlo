import "server-only";
import { getPlatformStats } from "./stats";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://falaai.cloud";
const BRAND_COLOR = 0xff7a3d; // mesma cor de marca do site (BRAND_COLOR em TenantThemeContext.tsx)

/** Embed + botões do /status, no estilo "card de status de servidor" pedido — dados reais da plataforma no lugar de jogadores/connect. */
export async function buildStatusMessage() {
  const stats = await getPlatformStats();
  const pendingTotal = stats.newSuggestions + stats.newFeedback + stats.newBugs;
  const healthy = stats.failedJobsLast24h === 0;

  const embed = {
    color: healthy ? 0x22c55e : 0xef4444,
    author: { name: "FALA AI", icon_url: `${SITE_URL}/favicon.ico` },
    title: "Status da plataforma",
    description: "CRM com IA para equipes de vendas — Transportadora, automações e tudo mais.",
    thumbnail: { url: `${SITE_URL}/favicon.ico` },
    fields: [
      {
        name: "Status:",
        value: healthy ? "```diff\n+ 🟢 ONLINE\n```" : "```diff\n- 🟠 COM FALHAS NA FILA\n```",
      },
      {
        name: "Plataforma:",
        value: `\`[ ${stats.crmCount} CRM${stats.crmCount === 1 ? "" : "s"} · ${stats.transportadoraCount} Transportadora${stats.transportadoraCount === 1 ? "" : "s"} · ${stats.userCount} usuário${stats.userCount === 1 ? "" : "s"} ]\``,
      },
      {
        name: "Pendências:",
        value: `\`[ ${pendingTotal} pendente${pendingTotal === 1 ? "" : "s"} — ${stats.newSuggestions} sugestão, ${stats.newFeedback} feedback, ${stats.newBugs} bug ]\``,
      },
      ...(stats.failedJobsLast24h > 0
        ? [
            {
              name: "⚠️ Falhas (24h):",
              value: `\`${stats.failedJobsLast24h} job${stats.failedJobsLast24h === 1 ? "" : "s"} falhou na fila de automação\``,
            },
          ]
        : []),
    ],
    footer: { text: "FALA AI" },
    timestamp: new Date().toISOString(),
  };

  const components = [
    {
      type: 1, // ACTION_ROW
      components: [
        { type: 2, style: 5, label: "Painel Dev", url: `${SITE_URL}/dev` },
        { type: 2, style: 5, label: "Central FALA AI", url: `${SITE_URL}/central` },
        { type: 2, style: 5, label: "Site", url: SITE_URL },
      ],
    },
  ];

  return { embeds: [embed], components };
}
