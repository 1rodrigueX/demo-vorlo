import Link from "next/link";
import { CheckCircle2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCentsBrl } from "@/lib/billing/pricing";
import { getPlanCopy } from "@/lib/billing/plan-copy";
import { FEATURES, HOW_IT_WORKS } from "@/lib/marketing/content";
import type { BillingPlan } from "@/types/domain";

export function LandingPage({ plans }: { plans: BillingPlan[] }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-panel">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              F
            </div>
            <span className="text-base font-semibold text-gray-900">FALA AI CRM</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Já sou cliente — Entrar
            </a>
            <Link href="/signup">
              <Button size="sm">Criar conta grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          O CRM com IA multi-agente pra sua equipe de vendas
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
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-gray-200 bg-panel p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <f.icon size={20} />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">{f.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{f.description}</p>
          </div>
        ))}
      </section>

      <section className="border-y border-gray-200 bg-panel py-16">
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

      <section id="planos" className="mx-auto max-w-5xl px-4 py-16">
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
                  className="flex flex-col rounded-2xl border border-gray-200 bg-panel p-6 shadow-sm"
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
      </section>
    </div>
  );
}
