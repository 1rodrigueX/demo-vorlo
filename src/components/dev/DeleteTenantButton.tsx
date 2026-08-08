"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { deleteTenantAsDev } from "@/lib/actions/dev-admin";

/**
 * Exclui um CRM inteiro (dados + usuários). Irreversível — por isso pede pra
 * digitar o nome da empresa pra confirmar.
 */
export function DeleteTenantButton({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    const typed = window.prompt(
      `Excluir "${tenantName}" APAGA TUDO desse CRM (contatos, negócios, conversas, usuários) e NÃO tem volta.\n\nPara confirmar, digite o nome da empresa:`,
    );
    if (typed === null) return; // cancelou
    if (typed.trim() !== tenantName.trim()) {
      toast.error("Nome não confere — exclusão cancelada.");
      return;
    }

    startTransition(async () => {
      const result = await deleteTenantAsDev(tenantId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`"${tenantName}" excluída.`);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      isLoading={isPending}
      onClick={handleClick}
      className="text-red-600 hover:bg-red-50"
    >
      <Trash2 size={14} />
      Excluir
    </Button>
  );
}
