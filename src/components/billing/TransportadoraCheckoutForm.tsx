"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  startTransportadoraCheckout,
  cancelPendingTransportadoraCheckout,
  type ActionState,
} from "@/lib/actions/transportadora-checkout";
import { formatCentsBrl } from "@/lib/billing/pricing";

export function ActiveTransportadoraCheckoutNotice() {
  const router = useRouter();
  const [isCancelling, startCancel] = useTransition();

  function handleCancel() {
    startCancel(async () => {
      await cancelPendingTransportadoraCheckout();
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
      <h1 className="text-lg font-semibold text-amber-900">Você já tem uma compra em andamento</h1>
      <p className="mt-2 text-sm text-amber-800">
        Se já pagou, aguarde alguns segundos e atualize a página. Se quer tentar de novo, cancele essa
        tentativa e comece de novo.
      </p>
      <Button variant="secondary" className="mt-4" isLoading={isCancelling} onClick={handleCancel}>
        Cancelar e recomeçar
      </Button>
    </div>
  );
}

export function TransportadoraCheckoutForm({
  planId,
  planName,
  monthlyPriceCents,
  hasExistingTenant,
  ownerName,
}: {
  planId: string;
  planName: string;
  monthlyPriceCents: number;
  hasExistingTenant: boolean;
  ownerName: string | null;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    startTransportadoraCheckout,
    null,
  );

  return (
    <div className="mx-auto max-w-md">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {ownerName ? `Falta pouco, ${ownerName.split(" ")[0]}!` : "Falta pouco!"}
        </h1>
        <p className="mt-2 text-sm text-gray-500">Libere o acesso ao app de gestão de fretes (Android).</p>
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-panel p-6 shadow-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-gray-900">{planName}</span>
          <span className="text-2xl font-bold text-gray-900">
            {formatCentsBrl(monthlyPriceCents)}
            <span className="text-sm font-normal text-gray-500">/mês</span>
          </span>
        </div>

        <form action={formAction} className="mt-6 space-y-4">
          <input type="hidden" name="planId" value={planId} />

          {!hasExistingTenant && (
            <div>
              <Label htmlFor="companyName">Nome da sua empresa</Label>
              <Input id="companyName" name="companyName" placeholder="Ex: Transportes Silva" required />
            </div>
          )}

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <Button type="submit" className="w-full" isLoading={isPending}>
            Assinar por {formatCentsBrl(monthlyPriceCents)}/mês
          </Button>
        </form>
      </div>
    </div>
  );
}
