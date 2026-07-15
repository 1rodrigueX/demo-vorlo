"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { KanbanSquare, MessageCircle, Sparkles, PlugZap, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { startCheckout, type ActionState } from "@/lib/actions/checkout";
import { calculateTotalCents, formatCentsUsd } from "@/lib/billing/pricing";
import type { BillingPlan } from "@/types/domain";

const FEATURES = [
  {
    icon: KanbanSquare,
    title: "Pipeline de vendas",
    description: "Kanban visual pra acompanhar cada negócio do primeiro contato até o fechamento.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp integrado",
    description: "Converse com seus leads direto pelo CRM, via número próprio (Twilio) ou QR code pessoal.",
  },
  {
    icon: Sparkles,
    title: "FALA AI — agentes de IA",
    description: "Crie SDR, atendente, financeiro e outros agentes de IA sob medida pra sua equipe, só conversando.",
  },
  {
    icon: PlugZap,
    title: "Integrações",
    description: "Bling, Gmail, Outlook, Google Agenda e mais — cada empresa conecta suas próprias contas.",
  },
];

function Stepper({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
          aria-label={`Diminuir ${label}`}
        >
          <Minus size={14} />
        </button>
        <span className="w-6 text-center text-sm font-semibold text-gray-900">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
          aria-label={`Aumentar ${label}`}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

export function LandingPage({ plan }: { plan: BillingPlan | null }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(startCheckout, null);
  const [extraSellers, setExtraSellers] = useState(0);
  const [extraManagers, setExtraManagers] = useState(0);
  const [extraAgents, setExtraAgents] = useState(0);
  const [extraIntegrations, setExtraIntegrations] = useState(0);

  const breakdown = useMemo(() => {
    if (!plan) return null;
    return calculateTotalCents(plan, { extraSellers, extraManagers, extraAgents, extraIntegrations });
  }, [plan, extraSellers, extraManagers, extraAgents, extraIntegrations]);

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
          <a href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Já sou cliente — Entrar
          </a>
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

      <section id="checkout" className="mx-auto max-w-3xl px-4 pb-24">
        <div className="rounded-2xl border border-gray-200 bg-panel p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900">Monte seu plano</h2>
          {!plan ? (
            <p className="mt-4 text-sm text-red-600">
              Não foi possível carregar os preços agora. Tente novamente em instantes.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-gray-500">
                A partir de <strong>{formatCentsUsd(plan.base_price_cents)}/mês</strong>, com {plan.included_sellers}{" "}
                vendedores, {plan.included_managers} gestores e {plan.included_agents} agente de IA (FALA AI)
                inclusos.
              </p>

              <div className="mt-6 divide-y divide-gray-100">
                <Stepper
                  label="Vendedores extras"
                  hint={`+${formatCentsUsd(plan.price_per_extra_seller_cents)}/mês cada`}
                  value={extraSellers}
                  onChange={setExtraSellers}
                />
                <Stepper
                  label="Gestores extras"
                  hint={`+${formatCentsUsd(plan.price_per_extra_manager_cents)}/mês cada`}
                  value={extraManagers}
                  onChange={setExtraManagers}
                />
                <Stepper
                  label="Agentes de IA extras"
                  hint={`+${formatCentsUsd(plan.price_per_agent_cents)}/mês cada (SDR, atendente, financeiro...)`}
                  value={extraAgents}
                  onChange={setExtraAgents}
                />
                <Stepper
                  label="Integrações extras"
                  hint={`+${formatCentsUsd(plan.price_per_integration_cents)}/mês cada (Bling, Gmail, Outlook...)`}
                  value={extraIntegrations}
                  onChange={setExtraIntegrations}
                />
              </div>

              <div className="mt-6 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-sm font-medium text-gray-700">Total mensal estimado</span>
                <span className="text-xl font-bold text-gray-900">
                  {breakdown ? formatCentsUsd(breakdown.totalCents) : "—"}
                </span>
              </div>

              <form action={formAction} className="mt-8 space-y-4">
                <input type="hidden" name="extraSellers" value={extraSellers} />
                <input type="hidden" name="extraManagers" value={extraManagers} />
                <input type="hidden" name="extraAgents" value={extraAgents} />
                <input type="hidden" name="extraIntegrations" value={extraIntegrations} />

                <div>
                  <Label htmlFor="companyName">Nome da empresa</Label>
                  <Input id="companyName" name="companyName" required />
                </div>
                <div>
                  <Label htmlFor="ownerFullName">Seu nome</Label>
                  <Input id="ownerFullName" name="ownerFullName" required />
                </div>
                <div>
                  <Label htmlFor="ownerEmail">Seu e-mail</Label>
                  <Input id="ownerEmail" name="ownerEmail" type="email" required autoComplete="email" />
                  <p className="mt-1 text-xs text-gray-500">
                    Você vai receber o acesso ao CRM nesse e-mail assim que o pagamento for confirmado.
                  </p>
                </div>

                {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

                <Button type="submit" className="w-full" isLoading={isPending}>
                  Continuar para pagamento
                </Button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
