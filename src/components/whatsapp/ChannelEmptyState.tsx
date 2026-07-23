import { CHANNEL_META, type ChannelKey } from "./channelMeta";

/**
 * Estado do corpo do chat quando o canal ativo ainda não tem integração/
 * mensagens (tudo além do WhatsApp, por enquanto). A estrutura já fica pronta:
 * quando o canal for conectado (fase de integrações), as mensagens entram aqui.
 */
export function ChannelEmptyState({ channel }: { channel: ChannelKey }) {
  const meta = CHANNEL_META[channel];
  const Icon = meta.icon;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: meta.gradient ?? meta.color, color: "#fff" }}
      >
        <Icon size={26} strokeWidth={2} />
      </div>
      <p className="text-sm font-semibold text-gray-900">{meta.label} ainda não conectado</p>
      <p className="max-w-xs text-xs text-gray-500">
        A integração com {meta.label} entra na fase de canais. Assim que conectada, as conversas deste
        canal aparecem aqui — sem sair desta tela.
      </p>
    </div>
  );
}
