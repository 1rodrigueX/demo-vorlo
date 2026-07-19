import { NextResponse } from "next/server";
import { verifyKey, InteractionType, InteractionResponseType } from "discord-interactions";
import { getPlatformStats } from "@/lib/discord/stats";
import { getDiscordConfig } from "@/lib/discord/config";

/**
 * Endpoint de Interactions do Discord — configurado direto no painel do app
 * (Interactions Endpoint URL), sem precisar de bot "online" (Gateway). Todo
 * slash command chega aqui via HTTP; a assinatura ed25519 prova que a
 * chamada veio mesmo do Discord (não tem sessão/token de usuário nesse
 * fluxo). Precisa do corpo cru (antes de JSON.parse) pra verificar.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  const rawBody = await request.text();

  const config = await getDiscordConfig();
  if (!config.publicKey || !signature || !timestamp) {
    return NextResponse.json({ error: "Não configurado" }, { status: 401 });
  }

  const isValid = await verifyKey(rawBody, signature, timestamp, config.publicKey);
  if (!isValid) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  const interaction = JSON.parse(rawBody);

  if (interaction.type === InteractionType.PING) {
    return NextResponse.json({ type: InteractionResponseType.PONG });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const commandName = interaction.data?.name;

    if (commandName === "status") {
      const stats = await getPlatformStats();
      const pendingTotal = stats.newSuggestions + stats.newFeedback + stats.newBugs;
      const content = [
        "🟢 **FALA AI está no ar**",
        "",
        `📊 ${stats.crmCount} CRM${stats.crmCount === 1 ? "" : "s"} · ${stats.transportadoraCount} Transportadora${stats.transportadoraCount === 1 ? "" : "s"} · ${stats.userCount} usuário${stats.userCount === 1 ? "" : "s"}`,
        `📥 ${pendingTotal} pendente${pendingTotal === 1 ? "" : "s"} (${stats.newSuggestions} sugestão, ${stats.newFeedback} feedback, ${stats.newBugs} bug)`,
        stats.failedJobsLast24h > 0
          ? `⚠️ ${stats.failedJobsLast24h} job${stats.failedJobsLast24h === 1 ? "" : "s"} falhou nas últimas 24h`
          : "✅ Sem falhas na fila nas últimas 24h",
      ].join("\n");

      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content },
      });
    }

    if (commandName === "stats") {
      const stats = await getPlatformStats();
      const content = [
        "📊 **Números da plataforma**",
        "",
        `**CRMs criados:** ${stats.crmCount}`,
        `**Transportadoras ativas:** ${stats.transportadoraCount}`,
        `**Usuários:** ${stats.userCount}`,
        `**Sugestões novas:** ${stats.newSuggestions}`,
        `**Feedback novo:** ${stats.newFeedback}`,
        `**Bugs novos:** ${stats.newBugs}`,
        `**Jobs falhados (24h):** ${stats.failedJobsLast24h}`,
      ].join("\n");

      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content },
      });
    }

    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: "Comando desconhecido." },
    });
  }

  return NextResponse.json({ error: "Tipo de interação não suportado" }, { status: 400 });
}
