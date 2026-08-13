"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, ImagePlus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import {
  saveCompanyProfile,
  uploadCatalog,
  deleteCatalogFile,
  uploadProductPhoto,
  deleteProductPhoto,
  type ActionState,
} from "@/lib/actions/company-profile";
import type { TenantCompanyProfile, CompanyProductPhoto, CompanyCatalog } from "@/types/domain";

export function CompanyProfileSettingsCard({
  profile,
  catalogs,
  photos,
}: {
  profile: TenantCompanyProfile | null;
  catalogs: (CompanyCatalog & { signedUrl: string })[];
  photos: (CompanyProductPhoto & { signedUrl: string })[];
}) {
  const router = useRouter();
  const [profileState, profileAction, isProfilePending] = useActionState<ActionState, FormData>(
    saveCompanyProfile,
    null,
  );
  const [catalogState, catalogAction, isCatalogPending] = useActionState<ActionState, FormData>(
    uploadCatalog,
    null,
  );
  const [photoState, photoAction, isPhotoPending] = useActionState<ActionState, FormData>(
    uploadProductPhoto,
    null,
  );
  const [isWorking, startWorking] = useTransition();
  const photoFormRef = useRef<HTMLFormElement>(null);
  const catalogFormRef = useRef<HTMLFormElement>(null);
  const wasPhotoPending = useRef(false);
  const wasCatalogPending = useRef(false);

  useEffect(() => {
    if (wasPhotoPending.current && !isPhotoPending && !photoState?.error) {
      photoFormRef.current?.reset();
    }
    wasPhotoPending.current = isPhotoPending;
  }, [isPhotoPending, photoState]);

  useEffect(() => {
    if (wasCatalogPending.current && !isCatalogPending && !catalogState?.error) {
      catalogFormRef.current?.reset();
    }
    wasCatalogPending.current = isCatalogPending;
  }, [isCatalogPending, catalogState]);

  function handleDeleteCatalog(catalogId: string) {
    startWorking(async () => {
      const result = await deleteCatalogFile(catalogId);
      if (result?.error) toast.error(result.error);
      router.refresh();
    });
  }

  function handleDeletePhoto(photoId: string) {
    startWorking(async () => {
      const result = await deleteProductPhoto(photoId);
      if (result?.error) toast.error(result.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Essas informações alimentam automaticamente os agentes de IA (Vorlo, SDR) — assim eles conseguem
        falar sobre a empresa, os produtos e onde o lead pode ver mais, sem você precisar reescrever isso no
        prompt.
      </p>

      <form action={profileAction} className="space-y-4">
        <div>
          <Label htmlFor="description">Descrição da empresa</Label>
          <Textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={profile?.description ?? ""}
            placeholder="O que a empresa vende, diferenciais, tom de voz..."
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="website">Site</Label>
            <Input
              id="website"
              name="website"
              placeholder="https://suaempresa.com.br"
              defaultValue={profile?.website ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="instagram">Instagram</Label>
            <Input id="instagram" name="instagram" placeholder="@suaempresa" defaultValue={profile?.instagram ?? ""} />
          </div>
        </div>
        {profileState?.error && <p className="text-sm text-red-600">{profileState.error}</p>}
        <Button type="submit" size="sm" isLoading={isProfilePending}>
          Salvar informações
        </Button>
      </form>

      <div className="border-t border-gray-100 pt-5">
        <h3 className="mb-2 text-xs font-semibold text-gray-500">Catálogos (PDF)</h3>

        {catalogs.length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {catalogs.map((catalog) => (
              <li
                key={catalog.id}
                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm"
              >
                <a
                  href={catalog.signedUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 items-center gap-2 text-indigo-600 hover:underline"
                >
                  <FileText size={15} className="shrink-0" />
                  <span className="truncate">{catalog.file_name}</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleDeleteCatalog(catalog.id)}
                  disabled={isWorking}
                  aria-label={`Remover catálogo ${catalog.file_name}`}
                  className="shrink-0 text-gray-400 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form ref={catalogFormRef} action={catalogAction} className="flex items-end gap-2">
          <div className="flex-1">
            <Input type="file" name="catalog" accept="application/pdf" required />
          </div>
          <Button type="submit" variant="secondary" size="sm" isLoading={isCatalogPending}>
            <Upload size={14} />
            Enviar
          </Button>
        </form>
        {catalogState?.error && <p className="mt-2 text-sm text-red-600">{catalogState.error}</p>}
      </div>

      <div className="border-t border-gray-100 pt-5">
        <h3 className="mb-2 text-xs font-semibold text-gray-500">Fotos de modelos de produtos</h3>

        {photos.length > 0 && (
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo) => (
              <div key={photo.id} className="group relative overflow-hidden rounded-lg border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.signedUrl} alt={photo.caption ?? photo.file_name} className="h-24 w-full object-cover" />
                {photo.caption && (
                  <p className="truncate bg-gray-50 px-2 py-1 text-[11px] text-gray-600">{photo.caption}</p>
                )}
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(photo.id)}
                  disabled={isWorking}
                  aria-label={`Remover foto ${photo.file_name}`}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        <form ref={photoFormRef} action={photoAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input type="file" name="photo" accept="image/*" required />
          </div>
          <div className="flex-1">
            <Input name="caption" placeholder="Legenda (opcional, ex: Modelo X)" />
          </div>
          <Button type="submit" variant="secondary" size="sm" isLoading={isPhotoPending}>
            <ImagePlus size={14} />
            Adicionar foto
          </Button>
        </form>
        {photoState?.error && <p className="mt-2 text-sm text-red-600">{photoState.error}</p>}
      </div>
    </div>
  );
}
