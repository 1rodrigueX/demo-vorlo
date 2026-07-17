import Link from "next/link";
import { CheckCircle2, KeyRound, Bot, Send, Sparkles as SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCentsBrl } from "@/lib/billing/pricing";
import { getPlanCopy } from "@/lib/billing/plan-copy";
import { FEATURES, HOW_IT_WORKS } from "@/lib/marketing/content";
import type { BillingPlan } from "@/types/domain";

const TRUST_POINTS = [
  "Cada empresa fica isolada — ninguém vê dado de outro CRM",
  "Pagamento via PIX, boleto ou cartão",
  "Suporte pelo próprio FALA AI, direto no CRM",
];

export function LandingPage({ plans }: { plans: BillingPlan[] }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-panel">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              F
            </div>
            <span className="text-base font-semibold text-gray-900">FALA AI CRM</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Já sou cliente — Entrar
            </Link>
            <Link href="/signup">
              <Button size="sm">Criar conta grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-gray-50 to-gray-50" />
        <div className="mx-auto max-w-5xl px-4 pt-16 pb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Simplifique <span className="text-indigo-600">suas vendas</span> com o FALA AI CRM
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600">
            Pipeline, WhatsApp e agentes de IA que atendem, qualificam e cobram por você — o FALA AI administra
            tudo isso a partir de uma conversa.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/signup">
              <Button size="md">Criar conta grátis</Button>
            </Link>
            <a href="#planos" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Ver planos e preços
            </a>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 pb-20">
          <PipelineMockup />
        </div>
      </section>

      {/* CONFIANÇA — pontos reais, sem selo/nota inventada */}
      <section className="border-y border-gray-200 bg-panel py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4">
          {TRUST_POINTS.map((point) => (
            <div key={point} className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              {point}
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES — bloco colorido, igual ao "centralizamos tudo" */}
      <section className="bg-[linear-gradient(160deg,#0b1220,#16213a)] py-16 text-white">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">
            Centralizamos toda a rotina de vendas em um só lugar
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-white/60">
            Do primeiro contato no WhatsApp até o fechamento — sem planilha, sem numero espalhado por vendedor.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-white/10 bg-white/5 p-5 transition-colors hover:bg-white/10"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <f.icon size={20} />
                </div>
                <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                <p className="mt-1 text-sm text-white/60">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ALTERNANDO TEXTO + MOCKUP — atendimento via WhatsApp */}
      <section className="py-16">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 lg:grid-cols-2">
          <ChatMockup />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Atendimento</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              A IA responde no WhatsApp antes do lead esfriar
            </h2>
            <p className="mt-3 text-sm text-gray-600">
              O FALA AI qualifica, tira dúvida e já registra o contato no pipeline — tudo isso enquanto sua equipe
              está ocupada em outra ligação. Você só entra na conversa quando o negócio já está quente.
            </p>
            <Link href="/signup" className="mt-5 inline-block">
              <Button>Criar conta grátis</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ALTERNANDO TEXTO + MOCKUP — automação/organização */}
      <section className="border-y border-gray-200 bg-panel py-16">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Organização</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              Ganho de tempo pra equipe inteira
            </h2>
            <p className="mt-3 text-sm text-gray-600">
              Cada negócio já nasce no estágio certo, com histórico completo da conversa. Gestores acompanham tudo
              num kanban só, sem precisar cobrar planilha de ninguém.
            </p>
            <Link href="/signup" className="mt-5 inline-block">
              <Button>Criar conta grátis</Button>
            </Link>
          </div>
          <div className="order-1 lg:order-2">
            <AutomationMockup />
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-2xl font-bold text-gray-900">Como funciona</h2>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <step.icon size={22} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Passo {i + 1}</p>
                <h3 className="mt-1 text-base font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-12 flex max-w-2xl items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
            <KeyRound size={20} className="mt-0.5 shrink-0 text-indigo-600" />
            <div>
              <h3 className="text-sm font-semibold text-indigo-900">Traga sua própria chave de IA</h3>
              <p className="mt-1 text-sm text-indigo-800">
                Já tem uma conta na Anthropic? Cole sua chave já no cadastro (ou depois, em Configurações) e use ela
                nos agentes de IA — sem depender de créditos compartilhados.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="border-t border-gray-200 bg-panel px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Planos pra cada tamanho de equipe</h2>
            <p className="mt-2 text-sm text-gray-500">Crie sua conta, conheça o CRM e escolha o plano depois.</p>
          </div>

          {plans.length === 0 ? (
            <p className="mt-8 text-center text-sm text-red-600">
              Não foi possível carregar os planos agora. Tente novamente em instantes.
            </p>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {plans.map((plan) => {
                const copy = getPlanCopy(plan.name);
                return (
                  <div
                    key={plan.id}
                    className={
                      "flex flex-col rounded-2xl border p-6 shadow-sm transition-shadow hover:shadow-md " +
                      (plan.is_default ? "border-indigo-300 ring-1 ring-indigo-200" : "border-gray-200")
                    }
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900">{plan.name}</h3>
                      {plan.is_default && <Badge className="bg-indigo-50 text-indigo-700">Recomendado</Badge>}
                    </div>
                    <p className="mt-2 text-3xl font-bold text-gray-900">
                      {formatCentsBrl(plan.base_price_cents)}
                      <span className="text-sm font-normal text-gray-500">/mês</span>
                    </p>
                    <p className="mt-2 text-sm text-gray-500">{copy.tagline}</p>
                    <ul className="mt-4 flex-1 space-y-2">
                      {copy.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
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
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-[linear-gradient(160deg,#0b1220,#16213a)] py-16 text-center text-white">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-2xl font-bold">Pronto pra organizar suas vendas?</h2>
          <p className="mt-2 text-sm text-white/60">
            Crie sua conta agora e conheça o CRM antes de escolher o plano.
          </p>
          <Link href="/signup" className="mt-6 inline-block">
            <Button size="md">Criar conta grátis</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

/** Prévia estilizada do pipeline — não é a tela real, é só uma "vitrine" visual pra hero. */
function PipelineMockup() {
  const columns = [
    { name: "Novo", color: "#6366f1", count: 4 },
    { name: "Contato", color: "#0ea5e9", count: 3 },
    { name: "Proposta", color: "#f59e0b", count: 2 },
    { name: "Fechado", color: "#22c55e", count: 5 },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-panel shadow-2xl shadow-indigo-900/10">
      <div className="flex items-center gap-1.5 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        <span className="ml-3 text-xs text-gray-400">falaai.cloud/pipeline</span>
      </div>
      <div className="flex">
        <div
          style={{ background: "linear-gradient(160deg,#0b1220,#16213a)" }}
          className="hidden w-40 shrink-0 flex-col gap-1 p-4 sm:flex"
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-[10px] font-bold text-white">
              F
            </div>
            <span className="text-[11px] font-semibold text-white">FALA AI CRM</span>
          </div>
          {["Dashboard", "Pipeline", "Leads", "E-mails"].map((item, i) => (
            <div
              key={item}
              className={
                "rounded-md px-2 py-1.5 text-[11px] font-medium " +
                (i === 1 ? "bg-indigo-600 text-white" : "text-white/60")
              }
            >
              {item}
            </div>
          ))}
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          {columns.map((col) => (
            <div key={col.name} className="min-w-0">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-gray-700">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: col.color }} />
                {col.name}
                <span className="text-gray-400">({col.count})</span>
              </div>
              <div className="space-y-1.5">
                {Array.from({ length: col.name === "Fechado" ? 2 : 2 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-lg border border-gray-200 bg-gray-50" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Prévia estilizada de conversa no WhatsApp respondida pelo FALA AI. */
function ChatMockup() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-gray-200 bg-panel p-4 shadow-xl shadow-indigo-900/10">
      <div className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Bot size={16} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-900">FALA AI</p>
          <p className="text-[11px] text-gray-400">respondendo agora</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-gray-100 px-3 py-2 text-xs text-gray-700">
          Oi, gostaria de saber o valor do plano pra 5 vendedores
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-indigo-600 px-3 py-2 text-xs text-white">
          Oi! Pro seu tamanho de equipe o plano Pro costuma encaixar bem — já te passo os detalhes e deixo
          registrado aqui no seu funil 👍
        </div>
        <div className="ml-auto max-w-[70%] rounded-2xl rounded-tr-sm bg-gray-100 px-3 py-2 text-xs text-gray-700">
          Perfeito, manda os detalhes
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5">
        <span className="flex-1 text-xs text-gray-300">Mensagem...</span>
        <Send size={14} className="text-indigo-600" />
      </div>
    </div>
  );
}

/** Prévia estilizada de notificações automáticas (lead qualificado, proposta enviada). */
function AutomationMockup() {
  const cards = [
    { icon: SparklesIcon, title: "Lead qualificado", desc: "Maria Ferreira · Estética Vitalle", tone: "indigo" },
    { icon: Send, title: "Proposta enviada", desc: "R$ 4.200 · aguardando resposta", tone: "amber" },
    { icon: CheckCircle2, title: "Negócio ganho", desc: "R$ 5.000 · Torres Odonto", tone: "emerald" },
  ] as const;
  const toneClasses = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-3">
      {cards.map((c, i) => (
        <div
          key={c.title}
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-panel p-3.5 shadow-md shadow-indigo-900/5"
          style={{ marginLeft: i % 2 === 0 ? 0 : 24 }}
        >
          <div className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg " + toneClasses[c.tone]}>
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
