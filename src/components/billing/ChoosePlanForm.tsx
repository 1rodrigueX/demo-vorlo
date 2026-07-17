"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import { startCheckout, cancelPendingCheckout, type ActionState } from "@/lib/actions/checkout";
import { calculateTotalCents, formatCentsBrl } from "@/lib/billing/pricing";
import { getPlanCopy } from "@/lib/billing/plan-copy";
import type { BillingPlan } from "@/types/domain";

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

export function ActiveCheckoutNotice() {
  const router = useRouter();
  const [isCancelling, startCancel] = useTransition();

  function handleCancel() {
    startCancel(async () => {
      await cancelPendingCheckout();
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
      <h1 className="text-lg font-semibold text-amber-900">Você já tem uma compra em andamento</h1>
      <p className="mt-2 text-sm text-amber-800">
        Se já pagou, aguarde alguns segundos e atualize a página. Se quer escolher outro plano, cancele essa
        tentativa e comece de novo.
      </p>
      <Button variant="secondary" className="mt-4" isLoading={isCancelling} onClick={handleCancel}>
        Cancelar e recomeçar
      </Button>
    </div>
  );
}

export function ChoosePlanForm({
  plans,
  preselectedPlanId,
  ownerName,
}: {
  plans: BillingPlan[];
  preselectedPlanId?: string;
  ownerName: string | null;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(startCheckout, null);
  const defaultPlan = plans.find((p) => p.id === preselectedPlanId) ?? plans.find((p) => p.is_default) ?? plans[0];
  const [selectedPlanId, setSelectedPlanId] = useState(defaultPlan?.id ?? "");
  const [extraSellers, setExtraSellers] = useState(0);
  const [extraManagers, setExtraManagers] = useState(0);
  const [extraAgents, setExtraAgents] = useState(0);
  const [extraIntegrations, setExtraIntegrations] = useState(0);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const breakdown = useMemo(() => {
    if (!selectedPlan) return null;
    return calculateTotalCents(selectedPlan, { extraSellers, extraManagers, extraAgents, extraIntegrations });
  }, [selectedPlan, extraSellers, extraManagers, extraAgents, extraIntegrations]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {ownerName ? `Falta pouco, ${ownerName.split(" ")[0]}!` : "Falta pouco!"}
        </h1>
        <p className="mt-2 text-sm text-gray-500">Escolha o plano da sua equipe pra liberar o CRM.</p>
      </div>

      {plans.length === 0 ? (
        <p className="mt-8 text-center text-sm text-red-600">
          Não foi possível carregar os planos agora. Tente novamente em instantes.
        </p>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {plans.map((plan) => {
                const copy = getPlanCopy(plan.name);
                const isSelected = plan.id === selectedPlanId;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={cn(
                      "rounded-2xl border p-5 text-left transition-colors",
                      isSelected
                        ? "border-indigo-500 bg-panel ring-2 ring-indigo-500"
                        : "border-gray-200 bg-panel hover:border-gray-300",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900">{plan.name}</h3>
                      {plan.is_default && <Badge className="bg-indigo-50 text-indigo-700">Recomendado</Badge>}
                    </div>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {formatCentsBrl(plan.base_price_cents)}
                      <span className="text-sm font-normal text-gray-500">/mês</span>
                    </p>
                    <p className="mt-2 text-xs text-gray-500">{copy.tagline}</p>
                    <ul className="mt-3 space-y-1.5">
                      {copy.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-1.5 text-xs text-gray-600">
                          <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-gray-400">
                      {plan.included_sellers} vendedores, {plan.included_managers} gestores, {plan.included_agents}{" "}
                      agente(s) de IA inclusos
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 rounded-2xl border border-gray-200 bg-panel p-6 sm:p-8">
              <form action={formAction} className="space-y-6">
                <input type="hidden" name="planId" value={selectedPlanId} />
                <input type="hidden" name="extraSellers" value={extraSellers} />
                <input type="hidden" name="extraManagers" value={extraManagers} />
                <input type="hidden" name="extraAgents" value={extraAgents} />
                <input type="hidden" name="extraIntegrations" value={extraIntegrations} />

                <div>
                  <Label htmlFor="companyName">Nome da empresa</Label>
                  <Input id="companyName" name="companyName" required />
                </div>

                <div>
                  <Label htmlFor="anthropicApiKey">Chave da API Anthropic (opcional)</Label>
                  <Input
                    id="anthropicApiKey"
                    name="anthropicApiKey"
                    type="password"
                    placeholder="sk-ant-..."
                    autoComplete="off"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Já tem uma chave da sua conta Anthropic? Cole aqui pra usar ela nos agentes de IA. Se deixar em
                    branco, você conecta depois em Configurações.
                  </p>
                </div>

                <div className="divide-y divide-gray-100 border-t border-gray-100">
                  <Stepper
                    label="Vendedores extras"
                    hint={
                      selectedPlan ? `+${formatCentsBrl(selectedPlan.price_per_extra_seller_cents)}/mês cada` : ""
                    }
                    value={extraSellers}
                    onChange={setExtraSellers}
                  />
                  <Stepper
                    label="Gestores extras"
                    hint={
                      selectedPlan ? `+${formatCentsBrl(selectedPlan.price_per_extra_manager_cents)}/mês cada` : ""
                    }
                    value={extraManagers}
                    onChange={setExtraManagers}
                  />
                  <Stepper
                    label="Agentes de IA extras"
                    hint={selectedPlan ? `+${formatCentsBrl(selectedPlan.price_per_agent_cents)}/mês cada` : ""}
                    value={extraAgents}
                    onChange={setExtraAgents}
                  />
                  <Stepper
                    label="Integrações extras"
                    hint={
                      selectedPlan ? `+${formatCentsBrl(selectedPlan.price_per_integration_cents)}/mês cada` : ""
                    }
                    value={extraIntegrations}
                    onChange={setExtraIntegrations}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                  <span className="text-sm font-medium text-gray-700">Total mensal estimado</span>
                  <span className="text-xl font-bold text-gray-900">
                    {breakdown ? formatCentsBrl(breakdown.totalCents) : "—"}
                  </span>
                </div>

                {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

                <Button type="submit" className="w-full" isLoading={isPending} disabled={!selectedPlanId}>
                  Continuar para pagamento
                </Button>
              </form>
            </div>
        </>
      )}
    </div>
  );
}
