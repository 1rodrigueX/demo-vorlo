"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { companyProfileSchema, productPhotoCaptionSchema } from "@/lib/validation/company-profile";
import {
  uploadCompanyAsset,
  deleteCompanyAsset,
  getCompanyAssetSignedUrl,
  MAX_CATALOG_SIZE,
  MAX_PRODUCT_PHOTO_SIZE,
} from "@/lib/storage/companyAssets";
import type { Database } from "@/types/database.types";

export type ActionState = { error?: string } | null;

async function requireAdminTenantId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ tenantId: string } | { error: string }> {
  const tenantId = await requireTenantId(supabase, userId);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!profile || (profile.role !== "owner" && profile.role !== "manager")) {
    return { error: "Só o dono ou gestor pode alterar essas configurações" };
  }

  return { tenantId };
}

export async function saveCompanyProfile(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = companyProfileSchema.safeParse({
    description: formData.get("description"),
    website: formData.get("website"),
    instagram: formData.get("instagram"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const admin = await requireAdminTenantId(supabase, user.id);
  if ("error" in admin) return { error: admin.error };

  const { error } = await supabase.from("tenant_company_profile").upsert(
    {
      tenant_id: admin.tenantId,
      description: parsed.data.description,
      website: parsed.data.website,
      instagram: parsed.data.instagram,
    },
    { onConflict: "tenant_id" },
  );

  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  revalidatePath("/settings");
  return null;
}

export async function uploadCatalog(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const file = formData.get("catalog");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione um arquivo" };
  if (file.size > MAX_CATALOG_SIZE) return { error: "Arquivo muito grande (máx. 20MB)" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const admin = await requireAdminTenantId(supabase, user.id);
  if ("error" in admin) return { error: admin.error };

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadCompanyAsset(admin.tenantId, "catalog", file.name, file.type, buffer);
  if ("error" in uploaded) return { error: `Não foi possível enviar o arquivo: ${uploaded.error}` };

  const { error } = await supabase.from("company_catalogs").insert({
    tenant_id: admin.tenantId,
    storage_path: uploaded.storagePath,
    file_name: file.name,
  });
  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  revalidatePath("/settings");
  return null;
}

export async function deleteCatalogFile(catalogId: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const admin = await requireAdminTenantId(supabase, user.id);
  if ("error" in admin) return { error: admin.error };

  const { data: catalog } = await supabase
    .from("company_catalogs")
    .select("storage_path")
    .eq("id", catalogId)
    .eq("tenant_id", admin.tenantId)
    .maybeSingle();

  const { error } = await supabase
    .from("company_catalogs")
    .delete()
    .eq("id", catalogId)
    .eq("tenant_id", admin.tenantId);
  if (error) return { error: "Não foi possível remover" };

  if (catalog?.storage_path) {
    await deleteCompanyAsset(catalog.storage_path);
  }

  revalidatePath("/settings");
  return null;
}

export async function uploadProductPhoto(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione uma imagem" };
  if (file.size > MAX_PRODUCT_PHOTO_SIZE) return { error: "Imagem muito grande (máx. 10MB)" };
  if (!file.type.startsWith("image/")) return { error: "Envie um arquivo de imagem" };

  const parsedCaption = productPhotoCaptionSchema.safeParse({ caption: formData.get("caption") });
  if (!parsedCaption.success) {
    return { error: parsedCaption.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const admin = await requireAdminTenantId(supabase, user.id);
  if ("error" in admin) return { error: admin.error };

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadCompanyAsset(admin.tenantId, "photos", file.name, file.type, buffer);
  if ("error" in uploaded) return { error: `Não foi possível enviar a imagem: ${uploaded.error}` };

  const { error } = await supabase.from("company_product_photos").insert({
    tenant_id: admin.tenantId,
    storage_path: uploaded.storagePath,
    file_name: file.name,
    caption: parsedCaption.data.caption,
  });
  if (error) return { error: `Não foi possível salvar: ${error.message}` };

  revalidatePath("/settings");
  return null;
}

export async function deleteProductPhoto(photoId: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const admin = await requireAdminTenantId(supabase, user.id);
  if ("error" in admin) return { error: admin.error };

  const { data: photo } = await supabase
    .from("company_product_photos")
    .select("storage_path")
    .eq("id", photoId)
    .eq("tenant_id", admin.tenantId)
    .maybeSingle();

  const { error } = await supabase
    .from("company_product_photos")
    .delete()
    .eq("id", photoId)
    .eq("tenant_id", admin.tenantId);
  if (error) return { error: "Não foi possível remover" };

  if (photo?.storage_path) {
    await deleteCompanyAsset(photo.storage_path);
  }

  revalidatePath("/settings");
  return null;
}

/** Signed URLs (bucket privado) pra exibir fotos/catálogos já salvos na tela de Configurações. */
export async function getCompanyAssetUrls(
  assets: { storage_path: string }[],
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    assets.map(async (a) => [a.storage_path, (await getCompanyAssetSignedUrl(a.storage_path)) ?? ""] as const),
  );
  return Object.fromEntries(entries);
}
