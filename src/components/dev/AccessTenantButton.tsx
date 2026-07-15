"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { viewTenantAsDev } from "@/lib/actions/dev-view";

export function AccessTenantButton({ tenantId }: { tenantId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await viewTenantAsDev(tenantId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      router.push("/dashboard");
    });
  }

  return (
    <Button type="button" variant="secondary" size="sm" isLoading={isPending} onClick={handleClick}>
      <LogIn size={14} />
      Acessar
    </Button>
  );
}
