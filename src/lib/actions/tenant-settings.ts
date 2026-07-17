"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantId } from "@/lib/auth/current-user";
import { updateTenantBrandingSchema, createTeamMemberSchema } from "@/lib/validation/tenant";
import { uploadCompanyAsset, deleteCompanyAsset, MAX_PRODUCT_PHOTO_SIZE } from "@/lib/storage/companyAssets";

export type ActionState = { error?: string } | null;

export async function updateTenantBranding(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateTenantBrandingSchema.safeParse({
    name: formData.get("name"),
    brandColor: formData.get("brandColor"),
    brandFont: formData.get("brandFont"),
    textSize: formData.get("textSize"),
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
    .update({
      name: parsed.data.name,
      brand_color: parsed.data.brandColor,
      brand_font: parsed.data.brandFont,
      text_size: parsed.data.textSize,
    })
    .eq("id", tenantId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "Só o dono ou gestor pode alterar essas configurações" };
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/settings");
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

  revalidatePath("/dashboard", "layout");
  revalidatePath("/settings");
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

  revalidatePath("/dashboard", "layout");
  revalidatePath("/settings");
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
  const { error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.fullName,
      tenant_id: profile.tenant_id,
      role: parsed.data.role,
    },
  });

  if (error) {
    return { error: `Não foi possível criar o acesso: ${error.message}` };
  }

  revalidatePath("/settings");
  return null;
}
