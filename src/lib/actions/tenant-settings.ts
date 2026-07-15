"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantId } from "@/lib/auth/current-user";
import { updateTenantBrandingSchema, createTeamMemberSchema } from "@/lib/validation/tenant";

export type ActionState = { error?: string } | null;

export async function updateTenantBranding(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateTenantBrandingSchema.safeParse({
    name: formData.get("name"),
    brandColor: formData.get("brandColor"),
    assistantButtonPosition: formData.get("assistantButtonPosition"),
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
      assistant_button_position: parsed.data.assistantButtonPosition,
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
