"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { grantExtraEmpresaAsDev } from "@/lib/actions/dev-erp-link";

/** Concede uma empresa extra direto pelo /dev — visão "mais profunda" que só
 * dev vê (nunca aparece pro dono do CRM), mesmo efeito de
 * solicitar_empresa_extra do Vorlo, sem passar pelo chat. */
export function GrantExtraEmpresaButton({ tenantId }: { tenantId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await grantExtraEmpresaAsDev(tenantId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Empresa extra concedida.");
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="ghost" size="sm" isLoading={isPending} onClick={handleClick} title="Conceder empresa extra">
      <Building2 size={14} />
    </Button>
  );
}
