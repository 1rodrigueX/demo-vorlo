"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Merge } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { mergeAllByEmail } from "@/lib/actions/contact-merge";

/**
 * Resolve todos os grupos de mesmo e-mail de uma vez. Grupos por nome ficam de
 * fora de propósito — ver mergeAllByEmail.
 */
export function MergeAllByEmailButton({ groupCount }: { groupCount: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (groupCount === 0) return null;

  function handleClick() {
    const label = groupCount === 1 ? "1 grupo" : `${groupCount} grupos`;
    if (!confirm(`Mesclar ${label} de contatos com o mesmo e-mail? O mais antigo de cada grupo fica.`)) return;

    startTransition(async () => {
      const result = await mergeAllByEmail();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.merged
          ? `${result.merged} ${result.merged === 1 ? "contato mesclado" : "contatos mesclados"}`
          : "Nada para mesclar",
      );
      router.refresh();
    });
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleClick} isLoading={isPending}>
      <Merge size={14} />
      Mesclar todos por e-mail ({groupCount})
    </Button>
  );
}
