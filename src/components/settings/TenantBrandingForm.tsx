"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
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
import { Select } from "@/components/ui/Select";
import { FONT_OPTIONS, TEXT_SIZE_OPTIONS, BORDER_RADIUS_OPTIONS } from "@/lib/theme/TenantThemeContext";
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
  const [color, setColor] = useState(tenant.brand_color);
  const [backgroundColor, setBackgroundColor] = useState(tenant.background_color ?? "");
  const [textColor, setTextColor] = useState(tenant.text_color ?? "");
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

        <div>
          <Label htmlFor="brandColor">Cor da marca</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-14 shrink-0 cursor-pointer rounded-md border border-gray-300 bg-panel"
              aria-label="Selecionar cor da marca"
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="backgroundColor">Cor de fundo (opcional)</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={backgroundColor || "#13141a"}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="h-10 w-14 shrink-0 cursor-pointer rounded-md border border-gray-300 bg-panel"
                aria-label="Selecionar cor de fundo"
              />
              <Input
                name="backgroundColor"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                pattern="^#[0-9a-fA-F]{6}$"
                placeholder="Padrão do tema"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="textColor">Cor das letras (opcional)</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={textColor || "#f5f5f5"}
                onChange={(e) => setTextColor(e.target.value)}
                className="h-10 w-14 shrink-0 cursor-pointer rounded-md border border-gray-300 bg-panel"
                aria-label="Selecionar cor das letras"
              />
              <Input
                name="textColor"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                pattern="^#[0-9a-fA-F]{6}$"
                placeholder="Padrão do tema"
              />
            </div>
          </div>
        </div>

        {(backgroundColor || textColor) && (
          <div
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            style={{
              backgroundColor: backgroundColor || undefined,
              color: textColor || undefined,
            }}
          >
            Prévia: assim vai ficar o texto sobre o fundo escolhido.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="brandFont">Fonte</Label>
            <Select id="brandFont" name="brandFont" defaultValue={tenant.brand_font || "default"}>
              {Object.entries(FONT_OPTIONS).map(([key, opt]) => (
                <option key={key} value={key}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="textSize">Tamanho do texto</Label>
            <Select id="textSize" name="textSize" defaultValue={tenant.text_size}>
              {Object.entries(TEXT_SIZE_OPTIONS).map(([key, opt]) => (
                <option key={key} value={key}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="borderRadius">Estilo de borda</Label>
            <Select id="borderRadius" name="borderRadius" defaultValue={tenant.border_radius}>
              {Object.entries(BORDER_RADIUS_OPTIONS).map(([key, opt]) => (
                <option key={key} value={key}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
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
