import Link from "next/link";
import {
  CheckCircle2,
  KeyRound,
  Bot,
  Send,
  Sparkles as SparklesIcon,
  Crown,
  PlugZap,
  Quote,
  Truck,
  Wallet,
  Boxes,
  Factory,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SynexaMark } from "@/components/brand/SynexaLogo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { formatCentsBrl } from "@/lib/billing/pricing";
import { getPlanCopy } from "@/lib/billing/plan-copy";
import { FEATURES, HOW_IT_WORKS } from "@/lib/marketing/content";
import type { BillingPlan } from "@/types/domain";

const TRUST_POINTS = [
  "Cada empresa fica isolada — ninguém vê dado de outro CRM",
  "Pagamento via PIX, boleto ou cartão",
  "Suporte pelo próprio Synexa, direto no CRM",
];

/** Acento único da marca (laranja) nos cards de recurso — sem cores neon. */
const FEATURE_ACCENTS = ["#ff5722", "#ff5722", "#ff5722", "#ff5722"] as const;

/** Produtos além do CRM — nome/descrição/link vêm de getAccountServices
 * (lib/auth/current-user). Só a Transportadora tem preço real hoje; os demais
 * ainda são placeholders ("em preparação"), então aparecem como "Em breve". */
const MODULES = [
  {
    key: "transportadora",
    name: "Transportadora",
    description: "App de gestão de fretes, clientes e motoristas.",
    icon: Truck,
    accent: "#ff5722",
    href: "/comprar-transportadora",
    hasPrice: true,
  },
  {
    key: "financas",
    name: "Finanças",
    description: "Controle financeiro completo — fluxo de caixa, contas e boletos.",
    icon: Wallet,
    accent: "#ff5722",
    href: "/comprar-financas",
    hasPrice: false,
  },
  {
    key: "estoque",
    name: "Estoque",
    description: "Controle de estoque, itens, entradas e saídas.",
    icon: Boxes,
    accent: "#ff5722",
    href: "/comprar-estoque",
    hasPrice: false,
  },
  {
    key: "producao",
    name: "Produção",
    description: "Turnos, máquinas, produtos e apontamento de produção.",
    icon: Factory,
    accent: "#ff5722",
    href: "/comprar-producao",
    hasPrice: false,
  },
] as const;

export function LandingPage({
  plans,
  transportadoraPriceCents,
}: {
  plans: BillingPlan[];
  transportadoraPriceCents: number | null;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-gray-200/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-base font-semibold tracking-tight text-gray-900">Synexa</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <a
              href="#recursos"
              className="hidden text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 sm:block"
            >
              Recursos
            </a>
            <a
              href="#planos"
              className="hidden text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 sm:block"
            >
              Planos
            </a>
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 sm:block"
            >
              Entrar
            </Link>
            <Link href="/signup">
              <Button size="sm">Criar conta grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <HeroBackground />
        <div className="mx-auto max-w-5xl px-4 pt-20 pb-10 text-center sm:pt-28">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-medium text-indigo-500 backdrop-blur">
            <SparklesIcon size={13} />
            CRM de vendas com agentes de IA
          </div>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            Simplifique{" "}
            <span className="bg-gradient-to-r from-[#ff9f78] via-[#ff5722] to-[#ff7a4d] bg-clip-text text-transparent">
              suas vendas
            </span>
            <br className="hidden sm:block" /> com o Synexa CRM
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-gray-600 sm:text-lg">
            Pipeline, WhatsApp e agentes de IA que atendem, qualificam e cobram por você — o Synexa administra
            tudo isso a partir de uma conversa.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup">
              <Button size="md">Criar conta grátis</Button>
            </Link>
            <a
              href="#recursos"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-100"
            >
              Ver recursos
            </a>
          </div>
        </div>

        {/* Mockup do produto — dark glass (é a tela real do CRM). */}
        <div className="relative mx-auto max-w-5xl px-4 pb-6">
          <PipelineMockup />
        </div>

        {/* 4 CARDS DE RECURSO — chapados, acento laranja (sem glow). */}
        <div id="recursos" className="mx-auto max-w-5xl scroll-mt-20 px-4 pt-6 pb-24">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <GlowCard key={f.title}>
                <div
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-white"
                  style={{ background: FEATURE_ACCENTS[i] }}
                >
                  <f.icon size={21} />
                </div>
                <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/55">{f.description}</p>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* CONFIANÇA — abre com o "Cada empresa fica isolada" da imagem, em destaque */}
      <section className="relative border-y border-gray-200/70 bg-panel py-14">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <Quote size={30} className="mx-auto mb-4 text-indigo-500" />
            <p className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
              Cada empresa fica <span className="text-indigo-500">isolada</span>.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Seus dados, seus números e suas conversas nunca se misturam com os de outro CRM.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {TRUST_POINTS.map((point) => (
              <div key={point} className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                {point}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ATENDIMENTO — texto + mockup de chat */}
      <section className="py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-12 px-4 lg:grid-cols-2">
          <ChatMockup />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Atendimento</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              A IA responde no WhatsApp antes do lead esfriar
            </h2>
            <p className="mt-4 text-base text-gray-600">
              O Synexa qualifica, tira dúvida e já registra o contato no pipeline — tudo isso enquanto sua equipe
              está ocupada em outra ligação. Você só entra na conversa quando o negócio já está quente.
            </p>
            <Link href="/signup" className="mt-6 inline-block">
              <Button>Criar conta grátis</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ORGANIZAÇÃO — texto + mockup de automação */}
      <section className="border-y border-gray-200/70 bg-panel py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-12 px-4 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Organização</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              Ganho de tempo pra equipe inteira
            </h2>
            <p className="mt-4 text-base text-gray-600">
              Cada negócio já nasce no estágio certo, com histórico completo da conversa. Gestores acompanham tudo
              num kanban só, sem precisar cobrar planilha de ninguém.
            </p>
            <Link href="/signup" className="mt-6 inline-block">
              <Button>Criar conta grátis</Button>
            </Link>
          </div>
          <div className="order-1 lg:order-2">
            <AutomationMockup />
          </div>
        </div>
      </section>

      {/* CONTA — texto + mockup de conta/integrações */}
      <section className="py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-12 px-4 lg:grid-cols-2">
          <AccountMockup />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Sua conta</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              Equipe, plano e integrações — tudo sob seu controle
            </h2>
            <p className="mt-4 text-base text-gray-600">
              Convide vendedores e gestores com permissões próprias, acompanhe o plano atual da sua empresa e
              conecte Bling, WhatsApp, e-mail e Power BI direto pelas configurações — sem precisar chamar
              suporte técnico.
            </p>
            <Link href="/signup" className="mt-6 inline-block">
              <Button>Criar conta grátis</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="border-t border-gray-200/70 bg-panel py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">Como funciona</h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => (
              <div
                key={step.title}
                className="relative rounded-2xl border border-gray-200/70 bg-background p-6 text-center"
              >
                <div
                  className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-white"
                  style={{ background: "linear-gradient(140deg, #ff7a4d, #ff5722)" }}
                >
                  <step.icon size={22} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Passo {i + 1}</p>
                <h3 className="mt-1 text-base font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-12 flex max-w-2xl items-start gap-3 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-5">
            <KeyRound size={20} className="mt-0.5 shrink-0 text-indigo-500" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Traga sua própria chave de IA</h3>
              <p className="mt-1 text-sm text-gray-600">
                Já tem uma conta na Anthropic? Cole sua chave já no cadastro (ou depois, em Configurações) e use ela
                nos agentes de IA — sem depender de créditos compartilhados.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="scroll-mt-20 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Planos pra cada tamanho de equipe</h2>
            <p className="mt-2 text-sm text-gray-500">Crie sua conta, conheça o CRM e escolha o plano depois.</p>
          </div>

          {plans.length === 0 ? (
            <p className="mt-8 text-center text-sm text-red-500">
              Não foi possível carregar os planos agora. Tente novamente em instantes.
            </p>
          ) : (
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {plans.map((plan) => {
                const copy = getPlanCopy(plan.name);
                const featured = plan.is_default;
                return (
                  <div
                    key={plan.id}
                    className={
                      "relative flex flex-col rounded-2xl border p-6 transition-all hover:-translate-y-1 " +
                      (featured
                        ? "border-indigo-400/60 bg-panel ring-1 ring-indigo-400/30"
                        : "border-gray-200/70 bg-panel hover:border-gray-300")
                    }
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900">{plan.name}</h3>
                      {featured && <Badge className="bg-indigo-500/15 text-indigo-500">Recomendado</Badge>}
                    </div>
                    <p className="mt-2 text-3xl font-bold text-gray-900">
                      {formatCentsBrl(plan.base_price_cents)}
                      <span className="text-sm font-normal text-gray-500">/mês</span>
                    </p>
                    <p className="mt-2 text-sm text-gray-500">{copy.tagline}</p>
                    <ul className="mt-4 flex-1 space-y-2">
                      {copy.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-xs text-gray-400">
                      {plan.included_sellers} vendedores · {plan.included_managers} gestores ·{" "}
                      {plan.included_agents} agente(s) de IA
                    </p>
                    <Link href={`/signup?plan=${plan.id}`} className="mt-5">
                      <Button className="w-full">Criar conta</Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          {/* MAIS PRODUTOS — módulos além do CRM (transportadora, finanças, ...) */}
          <div className="mt-20">
            <div className="text-center">
              <h3 className="text-2xl font-bold tracking-tight text-gray-900">Mais produtos Synexa</h3>
              <p className="mt-2 text-sm text-gray-500">
                Módulos que você contrata à parte, quando a operação precisar.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {MODULES.map((m) => {
                const price =
                  m.hasPrice && transportadoraPriceCents != null
                    ? `${formatCentsBrl(transportadoraPriceCents)}/mês`
                    : m.hasPrice
                      ? "Sob consulta"
                      : "Em breve";
                return (
                  <div
                    key={m.key}
                    className="group relative flex flex-col rounded-2xl border border-gray-200/70 bg-panel p-5 transition-all hover:-translate-y-1 hover:border-gray-300"
                  >
                    <div
                      className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-white"
                      style={{ background: m.accent }}
                    >
                      <m.icon size={21} />
                    </div>
                    <h4 className="text-base font-semibold text-gray-900">{m.name}</h4>
                    <p className="mt-1.5 flex-1 text-sm leading-relaxed text-gray-500">{m.description}</p>
                    <p className="mt-4 text-sm font-semibold text-gray-900">{price}</p>
                    <Link
                      href={m.href}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-500 transition-colors hover:text-indigo-400"
                    >
                      {m.hasPrice ? "Assinar" : "Saiba mais"}
                      <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL — banda escura (sem glow). */}
      <section className="relative overflow-hidden bg-[#0b0a12] py-20 text-center text-white">
        <div className="relative mx-auto max-w-2xl px-4">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Pronto pra organizar suas vendas?</h2>
          <p className="mt-3 text-base text-white/60">
            Crie sua conta agora e conheça o CRM antes de escolher o plano.
          </p>
          <Link href="/signup" className="mt-7 inline-block">
            <Button size="md">Criar conta grátis</Button>
          </Link>
        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="border-t border-gray-200/70 bg-background py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-gray-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <BrandMark />
            <span className="font-semibold text-gray-900">Synexa CRM</span>
          </div>
          <p>© {new Date().getFullYear()} Synexa — CRM de vendas com IA</p>
        </div>
      </footer>
    </div>
  );
}

/** Marca Synexa (S angular em gradiente azul→violeta). */
function BrandMark() {
  return <SynexaMark size={32} />;
}

/** Fundo do hero: grid sutil que some nas bordas (sem halos neon). */
function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,87,34,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,87,34,0.06)_1px,transparent_1px)] bg-[size:46px_46px] [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,#000_55%,transparent_100%)]" />
    </div>
  );
}

/** Card chapado escuro com borda fina — usado nos 4 recursos (sem glow). */
function GlowCard({ children }: { children: React.ReactNode }) {
  return <div className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-5">{children}</div>;
}

/** Prévia estilizada do pipeline — vitrine dark do hero (não é a tela real). */
function PipelineMockup() {
  const columns = [
    { name: "Novo", color: "#6d5cff", count: 4 },
    { name: "Contato", color: "#f43f5e", count: 3 },
    { name: "Proposta", color: "#f59e0b", count: 2 },
    { name: "Fechado", color: "#22c55e", count: 5 },
  ];
  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/10"
      style={{
        background: "linear-gradient(160deg, #14122b, #0b0a1a)",
        boxShadow: "0 30px 60px -30px rgba(0,0,0,0.7), inset 0 1px 0 0 rgba(255,255,255,0.05)",
      }}
    >
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-3 text-xs text-white/35">app.synexa.com.br/pipeline</span>
        <span className="ml-auto rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-white/40">+ Adicionar</span>
      </div>
      <div className="flex">
        <div className="hidden w-40 shrink-0 flex-col gap-1 border-r border-white/5 p-4 sm:flex">
          <div className="mb-3 flex items-center gap-2">
            <SynexaMark size={22} withCircuit={false} />
            <span className="text-[11px] font-semibold text-white">Synexa CRM</span>
          </div>
          {["Dashboard", "Pipeline", "Leads", "E-mails"].map((item, i) => (
            <div
              key={item}
              className={
                "rounded-md px-2 py-1.5 text-[11px] font-medium " +
                (i === 1 ? "text-white" : "text-white/45")
              }
              style={i === 1 ? { background: "linear-gradient(140deg,#ff7a4d,#ff5722)" } : undefined}
            >
              {item}
            </div>
          ))}
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          {columns.map((col) => (
            <div key={col.name} className="min-w-0">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-white/80">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: col.color }} />
                {col.name}
                <span className="text-white/35">({col.count})</span>
              </div>
              <div className="space-y-1.5">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-white/10 bg-white/[0.04] p-2"
                  >
                    <div className="mb-1.5 h-1.5 w-3/4 rounded-full bg-white/15" />
                    <div className="flex items-center gap-1">
                      <span className="h-4 w-4 rounded-full" style={{ background: `${col.color}55` }} />
                      <div className="h-1.5 w-1/2 rounded-full bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Prévia estilizada de conversa no WhatsApp respondida pelo Synexa. */
function ChatMockup() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-gray-200/70 bg-panel p-4 shadow-md shadow-black/10">
      <div className="mb-3 flex items-center gap-2 border-b border-gray-200/70 pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
          <Bot size={16} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-900">Synexa</p>
          <p className="text-[11px] text-gray-400">respondendo agora</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-gray-100 px-3 py-2 text-xs text-gray-700">
          Oi, gostaria de saber o valor do plano pra 5 vendedores
        </div>
        <div
          className="max-w-[85%] rounded-2xl rounded-tl-sm px-3 py-2 text-xs text-white"
          style={{ background: "linear-gradient(140deg,#ff7a4d,#ff5722)" }}
        >
          Oi! Pro seu tamanho de equipe o plano Pro costuma encaixar bem — já te passo os detalhes e deixo
          registrado aqui no seu funil 👍
        </div>
        <div className="ml-auto max-w-[70%] rounded-2xl rounded-tr-sm bg-gray-100 px-3 py-2 text-xs text-gray-700">
          Perfeito, manda os detalhes
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-full border border-gray-200/70 px-3 py-1.5">
        <span className="flex-1 text-xs text-gray-400">Mensagem...</span>
        <Send size={14} className="text-indigo-500" />
      </div>
    </div>
  );
}

/** Prévia estilizada da tela de conta: equipe, plano atual e integrações. */
function AccountMockup() {
  const team = [
    { initials: "MO", name: "Marcos", role: "Owner" },
    { initials: "AG", name: "Ana", role: "Gestora" },
    { initials: "JV", name: "João", role: "Vendedor" },
  ];
  const integrations = [
    { name: "WhatsApp", tone: "emerald" },
    { name: "Bling", tone: "amber" },
    { name: "E-mail", tone: "indigo" },
    { name: "Power BI", tone: "sky" },
  ] as const;
  const toneClasses = {
    emerald: "bg-emerald-500/15 text-emerald-500",
    amber: "bg-amber-500/15 text-amber-500",
    indigo: "bg-indigo-500/15 text-indigo-500",
    sky: "bg-sky-500/15 text-sky-500",
  };

  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200/70 bg-panel shadow-md shadow-black/10">
      <div className="flex items-center justify-between border-b border-gray-200/70 px-4 py-3">
        <p className="text-xs font-semibold text-gray-900">Sua equipe</p>
        <span className="flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[11px] font-medium text-indigo-500">
          <Crown size={11} /> Plano Pro
        </span>
      </div>
      <div className="space-y-2.5 px-4 py-3">
        {team.map((m) => (
          <div key={m.name} className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
              style={{ background: "linear-gradient(140deg,#ff7a4d,#ff5722)" }}
            >
              {m.initials}
            </div>
            <p className="flex-1 text-xs font-medium text-gray-800">{m.name}</p>
            <span className="text-[11px] text-gray-400">{m.role}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200/70 px-4 py-3">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
          <PlugZap size={12} /> Integrações conectadas
        </p>
        <div className="flex flex-wrap gap-1.5">
          {integrations.map((i) => (
            <span
              key={i.name}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${toneClasses[i.tone]}`}
            >
              {i.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Prévia estilizada de notificações automáticas (lead qualificado etc.). */
function AutomationMockup() {
  const cards = [
    { icon: SparklesIcon, title: "Lead qualificado", desc: "Maria Ferreira · Estética Vitalle", tone: "indigo" },
    { icon: Send, title: "Proposta enviada", desc: "R$ 4.200 · aguardando resposta", tone: "amber" },
    { icon: CheckCircle2, title: "Negócio ganho", desc: "R$ 5.000 · Torres Odonto", tone: "emerald" },
  ] as const;
  const toneClasses = {
    indigo: "bg-indigo-500/15 text-indigo-500",
    amber: "bg-amber-500/15 text-amber-500",
    emerald: "bg-emerald-500/15 text-emerald-500",
  };
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-3">
      {cards.map((c, i) => (
        <div
          key={c.title}
          className="flex items-center gap-3 rounded-2xl border border-gray-200/70 bg-panel p-3.5 shadow-md shadow-black/10"
          style={{ marginLeft: i % 2 === 0 ? 0 : 24 }}
        >
          <div className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl " + toneClasses[c.tone]}>
            <c.icon size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900">{c.title}</p>
            <p className="truncate text-[11px] text-gray-500">{c.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
