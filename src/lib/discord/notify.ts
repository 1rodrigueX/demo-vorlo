import "server-only";
import { sendDiscordMessage } from "./send";

const COLOR = {
  success: 0x22c55e,
  info: 0x6366f1,
  warning: 0xf59e0b,
  danger: 0xef4444,
};

export function notifyNewCrmTenant(name: string, slug: string) {
  return sendDiscordMessage({
    title: "🎉 Novo CRM criado",
    description: `**${name}** (\`${slug}\`)`,
    color: COLOR.success,
  });
}

export function notifyNewTransportadoraTenant(name: string, slug: string) {
  return sendDiscordMessage({
    title: "🚚 Nova Transportadora criada",
    description: `**${name}** (\`${slug}\`)`,
    color: COLOR.success,
  });
}

export function notifyNewFinancasTenant(name: string, slug: string) {
  return sendDiscordMessage({
    title: "💰 Novo Controle de Finanças criado",
    description: `**${name}** (\`${slug}\`)`,
    color: COLOR.success,
  });
}

export function notifyNewEstoqueTenant(name: string, slug: string) {
  return sendDiscordMessage({
    title: "📦 Novo Controle de Estoque criado",
    description: `**${name}** (\`${slug}\`)`,
    color: COLOR.success,
  });
}

export function notifyNewProducaoTenant(name: string, slug: string) {
  return sendDiscordMessage({
    title: "🏭 Novo Controle de Produção criado",
    description: `**${name}** (\`${slug}\`)`,
    color: COLOR.success,
  });
}

export function notifyNewErpTenant(name: string, slug: string) {
  return sendDiscordMessage({
    title: "🧾 Novo ERP standalone criado",
    description: `**${name}** (\`${slug}\`)`,
    color: COLOR.success,
  });
}

export function notifyNewFeedback(email: string, message: string) {
  return sendDiscordMessage({
    title: "💬 Novo feedback",
    description: message.slice(0, 500),
    color: COLOR.info,
    fields: [{ name: "De", value: email }],
  });
}

export function notifyNewSuggestion(tenantName: string, authorName: string, message: string) {
  return sendDiscordMessage({
    title: "💡 Nova sugestão",
    description: message.slice(0, 500),
    color: COLOR.info,
    fields: [
      { name: "Empresa", value: tenantName, inline: true },
      { name: "De", value: authorName, inline: true },
    ],
  });
}

export function notifyNewBugReport(tenantName: string, authorName: string, severity: string, message: string) {
  const isUrgent = severity === "critica" || severity === "alta";
  return sendDiscordMessage({
    title: `🐛 Novo bug reportado (${severity})`,
    description: message.slice(0, 500),
    color: isUrgent ? COLOR.danger : COLOR.warning,
    fields: [
      { name: "Empresa", value: tenantName, inline: true },
      { name: "De", value: authorName, inline: true },
    ],
  });
}

export function notifyJobFailure(jobType: string, tenantId: string, error: string) {
  return sendDiscordMessage({
    title: "⚠️ Job da automação falhou",
    description: error.slice(0, 500),
    color: COLOR.danger,
    fields: [
      { name: "Tipo", value: jobType, inline: true },
      { name: "Tenant", value: tenantId, inline: true },
    ],
  });
}
