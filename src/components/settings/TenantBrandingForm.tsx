"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { updateTenantBranding, type ActionState } from "@/lib/actions/tenant-settings";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import type { Tenant } from "@/types/domain";

export function TenantBrandingForm({ tenant }: { tenant: Tenant }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateTenantBranding,
    null,
  );
  const [color, setColor] = useState(tenant.brand_color);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      toast.success("Configurações salvas");
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome do CRM</Label>
        <Input id="name" name="name" required defaultValue={tenant.name} />
      </div>

      <div>
        <Label htmlFor="brandColor">Cor da marca</Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-14 shrink-0 cursor-pointer rounded-md border border-gray-300 bg-panel"
            aria-label="Selecionar cor"
          />
          <Input
            id="brandColor"
            name="brandColor"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            pattern="^#[0-9a-fA-F]{6}$"
            placeholder="#4f46e5"
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" isLoading={isPending}>
        Salvar
      </Button>
    </form>
  );
}
