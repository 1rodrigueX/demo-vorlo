"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTeamMemberSchema } from "@/lib/validation/tenant";
import { TOGGLEABLE_PRODUCTS, type ToggleableProduct } from "@/lib/team/products";
import type { Profile } from "@/types/domain";

export type ActionState = { error?: string } | null;
export type TeamMemberWithAccess = Profile & { email: string | null; products: ToggleableProduct[] };

type OwnerContext = { user: { id: string }; tenantId: string };

async function requireOwner(supabase: Awaited<ReturnType<typeof createClient>>): Promise<OwnerContext | { error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente" };

  const { data: profile } = await supabase.from("profiles").select("tenant_id, role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "owner") return { error: "Só o dono da empresa pode gerenciar usuários" };

  return { user, tenantId: profile.tenant_id };
}

export async function getTeamMembersWithAccess(): Promise<TeamMemberWithAccess[]> {
  const supabase = await createClient();
  const owner = await requireOwner(supabase);
  if ("error" in owner) return [];

  const [{ data: profiles }, { data: accessRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("tenant_id", owner.tenantId).order("role"),
    supabase.from("profile_product_access").select("profile_id, product"),
  ]);

  const admin = createAdminClient();
  return Promise.all(
    (profiles ?? []).map(async (p) => {
      const { data } = await admin.auth.admin.getUserById(p.id);
      const products = (accessRows ?? [])
        .filter((a) => a.profile_id === p.id)
        .map((a) => a.product as ToggleableProduct);
      return { ...p, email: data.user?.email ?? null, products };
    }),
  );
}

export async function createTeamMemberWithAccess(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createTeamMemberSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const owner = await requireOwner(supabase);
  if ("error" in owner) return { error: owner.error };

  const { data: tenant } = await supabase
    .from("tenants")
    .select("seller_limit, manager_limit")
    .eq("id", owner.tenantId)
    .single();
  if (!tenant) return { error: "Tenant não encontrado" };

  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", owner.tenantId)
    .eq("role", parsed.data.role);
  const limit = parsed.data.role === "member" ? tenant.seller_limit : tenant.manager_limit;
  if ((count ?? 0) >= limit) {
    return {
      error:
        parsed.data.role === "member" ? `Limite de ${limit} vendedores atingido` : `Limite de ${limit} gestores atingido`,
    };
  }

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.fullName,
      tenant_id: owner.tenantId,
      role: parsed.data.role,
    },
  });
  if (error || !created.user) {
    return { error: `Não foi possível criar o acesso: ${error?.message ?? "erro desconhecido"}` };
  }

  const selectedProducts = TOGGLEABLE_PRODUCTS.filter((p) => formData.get(`product_${p}`) === "on");
  if (selectedProducts.length > 0) {
    await admin
      .from("profile_product_access")
      .insert(selectedProducts.map((product) => ({ profile_id: created.user!.id, product })));
  }

  revalidatePath("/central/usuarios");
  return null;
}

export async function toggleProductAccess(
  profileId: string,
  product: ToggleableProduct,
  granted: boolean,
): Promise<ActionState> {
  const supabase = await createClient();
  const owner = await requireOwner(supabase);
  if ("error" in owner) return { error: owner.error };

  if (granted) {
    const { error } = await supabase.from("profile_product_access").insert({ profile_id: profileId, product });
    if (error && error.code !== "23505") return { error: error.message };
  } else {
    const { error } = await supabase
      .from("profile_product_access")
      .delete()
      .eq("profile_id", profileId)
      .eq("product", product);
    if (error) return { error: error.message };
  }

  revalidatePath("/central/usuarios");
  return null;
}

export async function deleteTeamMember(profileId: string): Promise<ActionState> {
  const supabase = await createClient();
  const owner = await requireOwner(supabase);
  if ("error" in owner) return { error: owner.error };
  if (profileId === owner.user.id) return { error: "Você não pode remover a si mesmo" };

  const { data: target } = await supabase.from("profiles").select("tenant_id").eq("id", profileId).maybeSingle();
  if (!target || target.tenant_id !== owner.tenantId) return { error: "Usuário não encontrado" };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(profileId);
  if (error) return { error: `Não foi possível remover: ${error.message}` };

  revalidatePath("/central/usuarios");
  return null;
}
