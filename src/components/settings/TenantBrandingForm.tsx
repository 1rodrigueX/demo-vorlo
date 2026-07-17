"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Upload, Play } from "lucide-react";
import {
  updateTenantBranding,
  uploadTenantLogo,
  removeTenantLogo,
  uploadClickSound,
  removeClickSound,
  type ActionState,
} from "@/lib/actions/tenant-settings";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import type { Tenant } from "@/types/domain";

export function TenantBrandingForm({
  tenant,
  logoUrl,
  clickSoundUrl,
}: {
  tenant: Tenant;
  logoUrl: string | null;
  clickSoundUrl: string | null;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateTenantBranding,
    null,
  );
  const [logoState, logoAction, isLogoPending] = useActionState<ActionState, FormData>(
    uploadTenantLogo,
    null,
  );
  const [soundState, soundAction, isSoundPending] = useActionState<ActionState, FormData>(
    uploadClickSound,
    null,
  );
  const [isRemoving, startRemove] = useTransition();
  const [isRemovingSound, startRemoveSound] = useTransition();
  const wasPending = useRef(false);
  const wasLogoPending = useRef(false);
  const wasSoundPending = useRef(false);
  const logoFormRef = useRef<HTMLFormElement>(null);
  const soundFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      toast.success("Configurações salvas");
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  useEffect(() => {
    if (wasLogoPending.current && !isLogoPending && !logoState?.error) {
      toast.success("Logo atualizada");
      logoFormRef.current?.reset();
      router.refresh();
    }
    wasLogoPending.current = isLogoPending;
  }, [isLogoPending, logoState, router]);

  useEffect(() => {
    if (wasSoundPending.current && !isSoundPending && !soundState?.error) {
      toast.success("Som de clique atualizado");
      soundFormRef.current?.reset();
      router.refresh();
    }
    wasSoundPending.current = isSoundPending;
  }, [isSoundPending, soundState, router]);

  function handleRemoveLogo() {
    startRemove(async () => {
      const result = await removeTenantLogo();
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleRemoveSound() {
    startRemoveSound(async () => {
      const result = await removeClickSound();
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleTestSound() {
    if (!clickSoundUrl) return;
    new Audio(clickSoundUrl).play().catch(() => {});
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome do CRM</Label>
          <Input id="name" name="name" required defaultValue={tenant.name} />
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <Button type="submit" isLoading={isPending}>
          Salvar
        </Button>
      </form>

      <div className="border-t border-gray-100 pt-5">
        <Label>Logo da empresa</Label>
        <p className="mb-3 mt-0.5 text-xs text-gray-500">Aparece na barra lateral no lugar da inicial do nome.</p>

        <div className="flex items-center gap-4">
          <div className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-gray-400">Sem logo</span>
            )}
          </div>

          <form ref={logoFormRef} action={logoAction} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <Input type="file" name="logo" accept="image/*" required className="flex-1" />
            <div className="flex gap-2">
              <Button type="submit" variant="secondary" size="sm" isLoading={isLogoPending}>
                <Upload size={14} />
                Enviar
              </Button>
              {logoUrl && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleRemoveLogo}
                  isLoading={isRemoving}
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          </form>
        </div>
        {logoState?.error && <p className="mt-2 text-sm text-red-600">{logoState.error}</p>}
      </div>

      <div className="border-t border-gray-100 pt-5">
        <Label>Som de clique</Label>
        <p className="mb-3 mt-0.5 text-xs text-gray-500">Toca um som curto a cada clique no CRM (opcional).</p>

        <div className="flex items-center gap-4">
          <form ref={soundFormRef} action={soundAction} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <Input type="file" name="sound" accept="audio/*" required className="flex-1" />
            <div className="flex gap-2">
              <Button type="submit" variant="secondary" size="sm" isLoading={isSoundPending}>
                <Upload size={14} />
                Enviar
              </Button>
              {clickSoundUrl && (
                <>
                  <Button type="button" variant="secondary" size="sm" onClick={handleTestSound}>
                    <Play size={14} />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleRemoveSound}
                    isLoading={isRemovingSound}
                  >
                    <Trash2 size={14} />
                  </Button>
                </>
              )}
            </div>
          </form>
        </div>
        {soundState?.error && <p className="mt-2 text-sm text-red-600">{soundState.error}</p>}
      </div>
    </div>
  );
}
