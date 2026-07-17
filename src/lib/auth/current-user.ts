import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type { Profile } from "@/types/domain";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) return { user, profile, isDevViewing: false as const };

  // Dev sem CRM próprio, mas com um tenant aberto pra visualizar (ver
  // src/lib/actions/dev-view.ts) — simula um profile só pra tela renderizar
  // (nome, cor, permissões de owner), sem criar uma linha real em profiles.
  const { data: devRow } = await supabase
    .from("dev_users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (devRow) {
    const { data: view } = await supabase
      .from("dev_active_view")
      .select("tenant_id")
      .eq("dev_id", user.id)
      .maybeSingle();

    if (view) {
      const syntheticProfile: Profile = {
        id: user.id,
        tenant_id: view.tenant_id,
        full_name: "Dev",
        role: "owner",
        avatar_url: null,
        seller_tag_id: null,
        created_at: new Date().toISOString(),
      };
      return { user, profile: syntheticProfile, isDevViewing: true as const };
    }
  }

  return { user, profile: null, isDevViewing: false as const };
}

/** Confere se o usuário logado é dev da plataforma (fora do modelo de tenant). */
export async function isCurrentUserDev() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("dev_users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  return !!data;
}

/** Busca o slug de um tenant pelo id — usado pra montar caminhos prefixados com o slug. */
export async function getTenantSlug(
  supabase: SupabaseClient<Database>,
  tenantId: string,
): Promise<string | null> {
  const { data } = await supabase.from("tenants").select("slug").eq("id", tenantId).maybeSingle();
  return data?.slug ?? null;
}

/**
 * Decide pra onde mandar um usuário já autenticado: dono/gestor/vendedor de
 * um CRM cai no dashboard do tenant; dev com um CRM aberto retoma de onde
 * parou; dev sem CRM aberto cai no painel dev; sem profile e sem ser dev
 * (cadastro via Google/e-mail-senha que ainda não pagou nenhum plano) cai na
 * escolha de plano. Recebe o client e o userId prontos pra poder ser
 * chamada tanto de Server Components/Actions quanto do middleware (que usa
 * um client montado sobre os cookies da request, não o de next/headers).
 */
export async function resolveHomeRouteFor(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle();
  if (profile) {
    const slug = await getTenantSlug(supabase, profile.tenant_id);
    return slug ? `/${slug}/dashboard` : "/login";
  }

  const { data: dev } = await supabase
    .from("dev_users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (!dev) return "/choose-plan";

  const { data: view } = await supabase
    .from("dev_active_view")
    .select("tenant_id")
    .eq("dev_id", userId)
    .maybeSingle();
  if (!view) return "/dev";

  const slug = await getTenantSlug(supabase, view.tenant_id);
  return slug ? `/${slug}/dashboard` : "/dev";
}

/** Mesma lógica de resolveHomeRouteFor, mas resolve a própria sessão/client — uso em Server Components/Actions. */
export async function resolveHomeRoute(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/login";

  return resolveHomeRouteFor(supabase, user.id);
}

/** Busca o tenant_id do usuário logado — usado pelas server actions antes de inserir dados. */
export async function requireTenantId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.tenant_id) return profile.tenant_id;

  const { data: view } = await supabase
    .from("dev_active_view")
    .select("tenant_id")
    .eq("dev_id", userId)
    .maybeSingle();

  return view?.tenant_id ?? null;
}
