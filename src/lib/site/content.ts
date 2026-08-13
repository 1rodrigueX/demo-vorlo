/* Conteúdo do site público VORLO (agência). Portado da referência.
 * Edite aqui para trocar textos/números. */

export const WHATSAPP = "5511947521848";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
  "Olá! Vim pelo site da VORLO e quero um orçamento.",
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
  title: "Sites e sistemas escritos à mão.",
  subtitle:
    "Sem tema comprado, sem construtor de arrastar e soltar. Cada projeto é escrito do zero — então quando você pedir uma coisa diferente, a resposta não vai ser \"não dá\".",
  primaryCta: "Pedir um orçamento",
  secondaryCta: "Ver o que fazemos",
} as const;

export const SERVICES = [
  {
    id: "landing",
    title: "Landing page",
    body: "Uma página com um objetivo só: fazer quem chegou pedir orçamento. Abre em menos de dois segundos, inclusive no celular no meio da rua.",
    points: ["Texto escrito pra converter", "Formulário que cai no seu WhatsApp"],
    href: "/orcamento",
  },
  {
    id: "institucional",
    title: "Site institucional",
    body: "Aquele link que seu vendedor manda antes da reunião. Mostra o que você já entregou e por que dá pra confiar no seu trabalho.",
    points: ["Painel pra você mesmo editar", "Preparado pra aparecer no Google"],
    href: "/orcamento",
  },
  {
    id: "ecommerce",
    title: "Loja virtual",
    body: "Catálogo, carrinho e pagamento no seu próprio domínio. Você vende direto, sem dividir a margem com marketplace.",
    points: ["Pagamento e frete já integrados", "Controle de estoque e pedidos"],
    href: "/signup",
  },
  {
    id: "crm",
    title: "CRM com IA",
    body: "Esse é meu, e eu uso todo dia: funil, WhatsApp e agentes de IA que atendem e qualificam sozinhos. Dá pra criar conta e testar agora.",
    points: ["Funil e WhatsApp no mesmo lugar", "Agentes de IA que atendem"],
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
  {
    id: "contrato",
    title: "Você sabe o preço antes",
    body: "Escopo, prazo e valor por escrito antes da primeira linha de código. Sem \"a partir de\".",
  },
  {
    id: "prazo",
    title: "A data está no contrato",
    body: "E toda semana você recebe notícia de como está indo, mesmo quando não tem novidade boa.",
  },
  {
    id: "seguranca",
    title: "Seguro desde o primeiro dia",
    body: "HTTPS, proteção contra invasão e backup automático desde a hora em que entra no ar.",
  },
  {
    id: "manutencao",
    title: "Eu continuo depois",
    body: "Correção, atualização e suporte depois de entregar. Seu site não fica órfão no dia seguinte.",
  },
] as const;

export const PROCESS = [
  {
    step: "01",
    title: "Conversa",
    body: "Uns 40 minutos pra entender o negócio, quem é seu cliente e o que você precisa que aconteça.",
  },
  {
    step: "02",
    title: "Desenho",
    body: "Você navega no protótipo e aprova antes de existir uma linha de código. Mudar aqui é barato.",
  },
  {
    step: "03",
    title: "Construção",
    body: "Escrito do zero, rápido no celular, com um endereço de teste aberto pra você acompanhar de perto.",
  },
  {
    step: "04",
    title: "No ar",
    body: "Publicação, domínio, e-mail profissional e sua equipe treinada pra mexer sem depender de mim.",
  },
] as const;

export const FINAL_CTA = {
  title: "Conta o que você precisa.",
  body: "Descreve o problema que você quer resolver. Eu respondo com escopo, prazo e valor — e se não for trabalho pra mim, eu falo isso também.",
  cta: "Pedir um orçamento",
} as const;

export const SOBRE = {
  eyebrow: "Sobre",
  nome: "Danillo Rodrigues",
  papel: "Desenvolvedor full-stack e fundador da VORLO",
  local: "São Paulo, SP",
  manifesto:
    "Comecei a VORLO porque cansei de ver empresa boa perdendo cliente por causa de site ruim. Não o site feio — o site que não carrega, que não abre direito no celular, que ninguém consegue atualizar sem chamar alguém. Empresa que resolve o problema do cliente todo dia merece um site que faça o mesmo.",
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
    "Dois projetos escritos do zero e rodando agora: meu CRM e este próprio site. Nenhum construtor de arrastar e soltar no meio.",
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
    id: "vorlo-crm",
    titulo: "Vorlo CRM",
    categoria: "Plataforma SaaS",
    descricao:
      "CRM de vendas com pipeline, WhatsApp integrado e agentes de IA que atendem e qualificam leads. Produto próprio, multi-empresa.",
    stack: ["Next.js", "Supabase", "TypeScript", "IA"],
    ano: "2026",
  },
];

export const QUOTE = {
  eyebrow: "Pedir orçamento",
  title: "Conta sua ideia. Eu devolvo escopo, prazo e valor.",
  intro:
    "Quanto mais detalhe você der, mais preciso fica o orçamento. Respondo em até 1 dia útil, pelo canal que você escolher.",
  successTitle: "Recebi seu pedido.",
  successBody:
    "Vou analisar e te responder em até 1 dia útil. Se quiser adiantar, manda a mesma mensagem no WhatsApp — ela já vai preenchida.",
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
