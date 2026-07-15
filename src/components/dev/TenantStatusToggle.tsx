"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { setTenantStatus } from "@/lib/actions/tenants";

export function TenantStatusToggle({
  tenantId,
  status,
}: {
  tenantId: string;
  status: "active" | "suspended";
}) {
  const [isPending, startTransition] = useTransition();
  const isActive = status === "active";

  function handleClick() {
    const next = isActive ? "suspended" : "active";
    const message = isActive
      ? "Suspender este CRM? O dono e a equipe perdem acesso imediatamente."
      : "Reativar este CRM?";
    if (!window.confirm(message)) return;

    startTransition(async () => {
      const result = await setTenantStatus(tenantId, next);
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <Button
      type="button"
      variant={isActive ? "secondary" : "primary"}
      size="sm"
      isLoading={isPending}
      onClick={handleClick}
    >
      {isActive ? <PowerOff size={14} /> : <Power size={14} />}
      {isActive ? "Suspender" : "Ativar"}
    </Button>
  );
}
