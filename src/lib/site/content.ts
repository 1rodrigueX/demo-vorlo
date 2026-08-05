/* Conteúdo do site público SYNEXA (agência). Portado da referência.
 * Edite aqui para trocar textos/números. */

export const WHATSAPP = "5511947521848";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
  "Olá! Vim pelo site da SYNEXA e quero um orçamento.",
)}`;
export const EMAIL_DESTINO = "rodriguesdanillo633@gmail.com";
/** Cole a chave do Web3Forms para o e-mail automático funcionar (opcional). */
export const WEB3FORMS_KEY = "";
export const GITHUB_USER = "1rodrigueX";
export const GITHUB_DESTAQUES: string[] = [];

export const NAV = [
  { label: "Serviços", href: "/#servicos" },
  { label: "Produtos", href: "/produtos" },
  { label: "Portfólio", href: "/portfolio" },
  { label: "Segurança", href: "/seguranca" },
  { label: "Sobre", href: "/sobre" },
  { label: "Garantias", href: "/#garantias" },
  { label: "Processo", href: "/#processo" },
] as const;

export const HERO = {
  eyebrow: "Sites · CRM · Automações com IA",
  title: "Presença digital que vende.",
  subtitle: "Sites, e-commerce e CRM que existem pra vender — não só pra estar online.",
  primaryCta: "Solicitar orçamento",
  secondaryCta: "Ver o que fazemos",
} as const;

export const SERVICES = [
  {
    id: "landing",
    title: "Landing Pages de Alta Conversão",
    body: "Uma página, um objetivo: transformar visita em orçamento. Estrutura testada, carregamento abaixo de dois segundos.",
    points: ["Copy orientada a conversão", "Formulário integrado ao WhatsApp"],
    href: "/orcamento",
  },
  {
    id: "institucional",
    title: "Sites Institucionais B2B",
    body: "A vitrine que sua equipe comercial manda antes da reunião. Autoridade, portfólio e prova social no lugar certo.",
    points: ["Painel para editar conteúdo", "Otimizado para busca no Google"],
    href: "/orcamento",
  },
  {
    id: "ecommerce",
    title: "E-commerce & Lojas Virtuais",
    body: "Catálogo, checkout e pagamento integrados. Sua operação vendendo direto, sem depender de marketplace.",
    points: ["Pagamento e frete integrados", "Gestão de estoque e pedidos"],
    href: "/orcamento",
  },
  {
    id: "crm",
    title: "CRM de Vendas com IA",
    body: "Nosso produto próprio: pipeline, WhatsApp e agentes de IA que atendem, qualificam e cobram. Crie sua conta e comece hoje.",
    points: ["Pipeline + WhatsApp integrados", "Agentes de IA (Synexa)"],
    href: "/signup",
  },
] as const;

export const STATS = [
  { value: 100, suffix: "%", label: "Código próprio", decimals: 0 },
  { value: 24, suffix: "/7", label: "Canal de suporte", decimals: 0 },
  { value: 20, prefix: "+", label: "Projetos entregues", decimals: 0 },
  { value: 7, suffix: " dias", label: "Prazo médio de entrega", decimals: 0 },
] as const;

export const GUARANTEES = [
  { id: "contrato", title: "Contrato Formal", body: "Escopo, prazo e valor por escrito antes da primeira linha de código." },
  { id: "prazo", title: "Prazo Garantido", body: "Data de entrega definida em contrato, com acompanhamento semanal do andamento." },
  { id: "seguranca", title: "Código Seguro", body: "HTTPS, proteção contra injeção e backup automático desde o primeiro dia no ar." },
  { id: "manutencao", title: "Manutenção Contínua", body: "Correções, atualizações e suporte depois da entrega. O site não fica órfão." },
] as const;

export const PROCESS = [
  { step: "01", title: "Briefing", body: "Uma conversa de 40 minutos para entender o negócio, o cliente e a meta comercial." },
  { step: "02", title: "Design", body: "Protótipo navegável aprovado por você antes de qualquer desenvolvimento começar." },
  { step: "03", title: "Desenvolvimento", body: "Código próprio, responsivo e otimizado, com ambiente de teste aberto para acompanhar." },
  { step: "04", title: "Lançamento", body: "Publicação, domínio, e-mail profissional e treinamento da sua equipe." },
] as const;

export const FINAL_CTA = {
  title: "Seu concorrente já está online.",
  body: "Conte o que sua empresa precisa. Respondemos com escopo, prazo e valor — sem enrolação.",
  cta: "Solicitar orçamento",
} as const;

export const SOBRE = {
  eyebrow: "Sobre",
  nome: "Danillo Rodrigues",
  papel: "Desenvolvedor full-stack e fundador da SYNEXA",
  local: "São Paulo, SP",
  manifesto:
    "Comecei a SYNEXA porque cansei de ver empresa boa perdendo cliente por causa de site ruim. Não o site feio — o site que não carrega, que não abre direito no celular, que ninguém consegue atualizar sem chamar alguém. Empresa que resolve o problema do cliente todo dia merece um site que faça o mesmo.",
  historia: [
    "Trabalho com código porque gosto de resolver problema que dá para medir: a página carregava em oito segundos, agora carrega em dois; o cliente ligava para pedir orçamento, agora pede sozinho pelo site.",
    "Cada projeto aqui é escrito do zero. Não uso construtor de arrastar e soltar nem tema comprado, porque quando o cliente pede uma coisa que o tema não faz, a resposta não pode ser \"não dá\".",
  ],
  principios: [
    { titulo: "Escrevo, não monto", corpo: "Código próprio do início ao fim. Sem tema comprado, sem plugin para tudo. O que o cliente pedir, dá para fazer." },
    { titulo: "Falo o preço antes", corpo: "Escopo, prazo e valor por escrito antes da primeira linha. Sem \"a partir de\", sem surpresa no meio do caminho." },
    { titulo: "Entrego funcionando", corpo: "No ar, no domínio certo, rápido no celular e com a sua equipe treinada para mexer. Site entregue pela metade não é entregue." },
    { titulo: "Continuo depois", corpo: "Manutenção e suporte após a entrega. O projeto não vira problema seu no dia seguinte à publicação." },
  ],
  stack: ["TypeScript", "React", "Next.js", "Node.js", "Python", "HTML & CSS", "SQL", "Tailwind"],
  foto: "/sobre/foto.webp",
} as const;

export const PORTFOLIO = {
  eyebrow: "Portfólio",
  title: "Sem template pra mostrar. Produto no ar.",
  intro:
    "Dois projetos escritos do zero e em produção agora: o nosso CRM e este próprio site. Sem construtor de arrastar-e-soltar.",
} as const;

export interface Projeto {
  id: string;
  titulo: string;
  categoria: string;
  descricao: string;
  stack: string[];
  url?: string;
  imagem?: string;
  ano?: string;
}

export const PROJETOS: Projeto[] = [
  {
    id: "synexa-crm",
    titulo: "Synexa CRM",
    categoria: "Plataforma SaaS",
    descricao:
      "CRM de vendas com pipeline, WhatsApp integrado e agentes de IA que atendem e qualificam leads. Produto próprio, multi-empresa.",
    stack: ["Next.js", "Supabase", "TypeScript", "IA"],
    ano: "2026",
  },
];

export const QUOTE = {
  eyebrow: "Solicitar orçamento",
  title: "Conte sua ideia. Devolvemos escopo, prazo e valor.",
  intro:
    "Quanto mais detalhe você der, mais preciso é o orçamento. Respondemos em até 1 dia útil pelo canal que você escolher.",
  successTitle: "Recebemos sua solicitação.",
  successBody:
    "Vamos analisar e responder em até 1 dia útil. Se preferir adiantar, mande a mesma mensagem pelo WhatsApp — ela já vai preenchida.",
} as const;

export const TIPOS_PROJETO = [
  "Landing page de alta conversão",
  "Site institucional B2B",
  "E-commerce / loja virtual",
  "Plataforma personalizada com login",
  "CRM / sistema de vendas",
  "Reformular um site que já existe",
  "Ainda não sei — quero orientação",
] as const;

export const FAIXAS_ORCAMENTO = [
  "Até R$ 3.000",
  "R$ 3.000 a R$ 8.000",
  "R$ 8.000 a R$ 20.000",
  "Acima de R$ 20.000",
  "Prefiro discutir depois",
] as const;

export const PRAZOS = ["O quanto antes", "Em até 1 mês", "Em 1 a 3 meses", "Sem pressa definida"] as const;
