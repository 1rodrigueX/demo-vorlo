"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantId } from "@/lib/auth/current-user";
import { updateTenantBrandingSchema, createTeamMemberSchema } from "@/lib/validation/tenant";
import {
  uploadCompanyAsset,
  deleteCompanyAsset,
  MAX_PRODUCT_PHOTO_SIZE,
  MAX_SOUND_SIZE,
} from "@/lib/storage/companyAssets";

export type ActionState = { error?: string } | null;

export async function updateTenantBranding(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateTenantBrandingSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data, error } = await supabase
    .from("tenants")
    .update({ name: parsed.data.name })
    .eq("id", tenantId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "Só o dono ou gestor pode alterar essas configurações" };
  }

  revalidatePath("/[tenantSlug]/dashboard", "layout");
  revalidatePath("/[tenantSlug]/settings", "page");
  return null;
}

export async function uploadTenantLogo(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione uma imagem" };
  if (file.size > MAX_PRODUCT_PHOTO_SIZE) return { error: "Imagem muito grande (máx. 10MB)" };
  if (!file.type.startsWith("image/")) return { error: "Envie um arquivo de imagem" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: current } = await supabase
    .from("tenants")
    .select("logo_storage_path")
    .eq("id", tenantId)
    .maybeSingle();

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadCompanyAsset(tenantId, "logo", file.name, file.type, buffer);
  if ("error" in uploaded) return { error: `Não foi possível enviar a imagem: ${uploaded.error}` };

  const { error } = await supabase
    .from("tenants")
    .update({ logo_storage_path: uploaded.storagePath })
    .eq("id", tenantId);

  if (error) {
    await deleteCompanyAsset(uploaded.storagePath);
    return { error: "Só o dono ou gestor pode alterar essas configurações" };
  }

  if (current?.logo_storage_path) {
    await deleteCompanyAsset(current.logo_storage_path);
  }

  revalidatePath("/[tenantSlug]/dashboard", "layout");
  revalidatePath("/[tenantSlug]/settings", "page");
  return null;
}

export async function removeTenantLogo(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: current } = await supabase
    .from("tenants")
    .select("logo_storage_path")
    .eq("id", tenantId)
    .maybeSingle();
  if (!current?.logo_storage_path) return null;

  const { error } = await supabase.from("tenants").update({ logo_storage_path: null }).eq("id", tenantId);
  if (error) return { error: "Só o dono ou gestor pode alterar essas configurações" };

  await deleteCompanyAsset(current.logo_storage_path);

  revalidatePath("/[tenantSlug]/dashboard", "layout");
  revalidatePath("/[tenantSlug]/settings", "page");
  return null;
}

export async function uploadClickSound(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const file = formData.get("sound");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione um arquivo de áudio" };
  if (file.size > MAX_SOUND_SIZE) return { error: "Arquivo muito grande (máx. 2MB)" };
  if (!file.type.startsWith("audio/")) return { error: "Envie um arquivo de áudio" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: current } = await supabase
    .from("tenants")
    .select("click_sound_path")
    .eq("id", tenantId)
    .maybeSingle();

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadCompanyAsset(tenantId, "sound", file.name, file.type, buffer);
  if ("error" in uploaded) return { error: `Não foi possível enviar o áudio: ${uploaded.error}` };

  const { error } = await supabase
    .from("tenants")
    .update({ click_sound_path: uploaded.storagePath })
    .eq("id", tenantId);

  if (error) {
    await deleteCompanyAsset(uploaded.storagePath);
    return { error: "Só o dono ou gestor pode alterar essas configurações" };
  }

  if (current?.click_sound_path) {
    await deleteCompanyAsset(current.click_sound_path);
  }

  revalidatePath("/[tenantSlug]/dashboard", "layout");
  revalidatePath("/[tenantSlug]/settings", "page");
  return null;
}

export async function removeClickSound(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { error: "Tenant não encontrado" };

  const { data: current } = await supabase
    .from("tenants")
    .select("click_sound_path")
    .eq("id", tenantId)
    .maybeSingle();
  if (!current?.click_sound_path) return null;

  const { error } = await supabase.from("tenants").update({ click_sound_path: null }).eq("id", tenantId);
  if (error) return { error: "Só o dono ou gestor pode alterar essas configurações" };

  await deleteCompanyAsset(current.click_sound_path);

  revalidatePath("/[tenantSlug]/dashboard", "layout");
  revalidatePath("/[tenantSlug]/settings", "page");
  return null;
}

export async function createTeamMember(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createTeamMemberSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "owner" && profile.role !== "manager")) {
    return { error: "Só o dono ou gestor pode criar acesso de equipe" };
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("seller_limit, manager_limit")
    .eq("id", profile.tenant_id)
    .single();

  if (!tenant) return { error: "Tenant não encontrado" };

  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", profile.tenant_id)
    .eq("role", parsed.data.role);

  const limit = parsed.data.role === "member" ? tenant.seller_limit : tenant.manager_limit;
  if ((count ?? 0) >= limit) {
    return {
      error:
        parsed.data.role === "member"
          ? `Limite de ${limit} vendedores atingido`
          : `Limite de ${limit} gestores atingido`,
    };
  }

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.fullName,
      tenant_id: profile.tenant_id,
      role: parsed.data.role,
    },
  });

  if (error || !created.user) {
    return { error: `Não foi possível criar o acesso: ${error?.message ?? "erro desconhecido"}` };
  }

  // handle_new_user() (trigger em auth.users) é código morto desde a migração
  // pro Auth.js — createUser() do shim só grava em app_users, nunca em
  // auth.users, então o trigger nunca dispara. Sem isso, o convidado não
  // ganhava profile nenhum e não conseguia nem logar.
  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: parsed.data.fullName,
    tenant_id: profile.tenant_id,
    role: parsed.data.role,
  });
  if (profileError) {
    return { error: `Não foi possível criar o acesso: ${profileError.message}` };
  }

  revalidatePath("/[tenantSlug]/settings", "page");
  return null;
}
