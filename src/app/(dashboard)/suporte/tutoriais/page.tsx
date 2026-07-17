import { Card } from "@/components/ui/Card";

const GUIDES = [
  {
    title: "Anthropic (IA dos agentes de negócio)",
    steps: [
      "Crie uma chave em console.anthropic.com/settings/keys",
      "Cole a chave em Configurações → Inteligência Artificial",
    ],
    link: "https://console.anthropic.com/settings/keys",
    note: "O FALA AI (aba Suporte) já funciona sem isso — a chave própria só é necessária pros outros agentes (SDR, atendente, etc).",
  },
  {
    title: "Bling (ERP)",
    steps: [
      "Cadastre um app do integrador em developer.bling.com.br",
      "Copie o Client ID e Client Secret do app pra Configurações → Bling",
      "Cole a URL de redirecionamento mostrada em Configurações → Bling exatamente igual no app do Bling",
    ],
    link: "https://developer.bling.com.br",
    note: "O Bling exige que a URL do CRM seja HTTPS — não funciona só com o IP do servidor.",
  },
  {
    title: "Gmail",
    steps: [
      "Crie credenciais OAuth em console.cloud.google.com → APIs & Services → Credentials",
      "Cadastre a URL de redirecionamento: {URL do CRM}/api/integrations/gmail/callback",
      "Conecte em Configurações → E-mail",
    ],
    link: "https://console.cloud.google.com",
  },
  {
    title: "Outlook",
    steps: [
      "Crie um app registration em portal.azure.com",
      "Cadastre a URL de redirecionamento: {URL do CRM}/api/integrations/outlook/callback",
      "Conecte em Configurações → E-mail",
    ],
    link: "https://portal.azure.com",
  },
  {
    title: "Música (busca do YouTube)",
    steps: [
      "Em console.cloud.google.com, ative a \"YouTube Data API v3\" (menu APIs e Serviços → Biblioteca → busque por ela → Ativar)",
      "Vá em APIs e Serviços → Credenciais → Criar credenciais → Chave de API",
      "Copie a chave gerada e cole em Configurações → Música",
    ],
    link: "https://console.cloud.google.com/apis/library/youtube.googleapis.com",
    note: "É uma chave de API simples (não precisa de OAuth/redirect URI). O Google dá uma cota diária gratuita, suficiente pro uso normal do time.",
  },
  {
    title: "Música (Spotify) — configuração do dev, não dos clientes",
    steps: [
      "Crie um app em developer.spotify.com/dashboard",
      "Cadastre a URL de redirecionamento: {URL do CRM}/api/spotify/callback",
      "Copie o Client ID e Client Secret pras variáveis SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET no servidor",
    ],
    link: "https://developer.spotify.com/dashboard",
    note: "É configurado uma vez só pela plataforma (não por CRM) — depois disso, cada usuário clica em \"Conectar Spotify\" na aba Música e loga com a própria conta. Exige HTTPS e conta Spotify Premium do usuário pra tocar a faixa completa.",
  },
];

export default function TutoriaisPage() {
  return (
    <div className="h-full space-y-4 overflow-y-auto pb-4">
      {GUIDES.map((guide) => (
        <Card key={guide.title} className="p-5">
          <h2 className="text-sm font-semibold text-gray-900">{guide.title}</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-gray-600">
            {guide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {guide.note && <p className="mt-2 text-xs text-gray-400">{guide.note}</p>}
          <a
            href={guide.link}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline"
          >
            Abrir {new URL(guide.link).hostname} ↗
          </a>
        </Card>
      ))}
    </div>
  );
}
