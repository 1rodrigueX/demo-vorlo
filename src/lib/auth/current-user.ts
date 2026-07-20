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
        color: "#6366f1",
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
 * Decide pra onde mandar um usuário já autenticado. FALA AI é uma central
 * com vários produtos independentes (CRM, Transportadora, e futuramente
 * mais) — quem tem profile (cliente "normal", com ou sem produto ativo) cai
 * sempre na central de contas, de onde escolhe qual acessar ou assina um
 * novo. Dev com um CRM aberto pra visualizar retoma de onde parou; dev sem
 * CRM aberto cai no painel dev — esse fluxo é de suporte/impersonation, não
 * passa pela central. Recebe o client e o userId prontos pra poder ser
 * chamada tanto de Server Components/Actions quanto do middleware (que usa
 * um client montado sobre os cookies da request, não o de next/headers).
 */
export async function resolveHomeRouteFor(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string> {
  // Sessão pode estar em aal1 (só senha) mesmo com MFA ativado, até
  // completar o segundo fator — checado aqui primeiro pra todo mundo que
  // chama essa função (login, signup, callback do Google, "voltar" da
  // compra da Transportadora etc.) já respeitar isso sem duplicar a lógica.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== aal.nextLevel) {
    return "/mfa-challenge";
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (profile) return "/central";

  // Funcionário de Produção não tem profile (de propósito — ver migration
  // 0057) e não deve cair na central de contas, que é pro dono da conta.
  // Ele só acessa a tela de apontamento do próprio tenant.
  const { data: funcionario } = await supabase
    .from("producao_funcionarios")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle();
  if (funcionario) {
    const slug = await getTenantSlug(supabase, funcionario.tenant_id);
    return slug ? `/${slug}/producao/apontamento` : "/login";
  }

  const { data: dev } = await supabase
    .from("dev_users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (!dev) return "/central";

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

export type AccountService = {
  key: "crm" | "transportadora" | "financas" | "estoque" | "producao";
  name: string;
  description: string;
  active: boolean;
  href: string;
};

/** Produtos da conta pra tela /central — cada um resolve seu próprio status e destino, sem depender um do outro. */
export async function getAccountServices(): Promise<{
  services: AccountService[];
  ownerName: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { services: [], ownerName: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  // billing_plan_id é o sinal de "tem CRM" — fica null pros tenants que só
  // compraram a Transportadora (profile existe, mas sem CRM nenhum). O
  // painel dev também precisa setar isso ao criar um CRM (ver tenants.ts),
  // senão um CRM criado por lá cairia aqui como "não assinado" por engano.
  let crmActive = false;
  let crmSlug: string | null = null;
  if (profile) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("slug, billing_plan_id")
      .eq("id", profile.tenant_id)
      .maybeSingle();
    crmActive = !!tenant?.billing_plan_id;
    crmSlug = tenant?.slug ?? null;
  }

  const [{ data: hasTransportadora }, { data: hasFinancas }, { data: hasEstoque }, { data: hasProducao }] =
    await Promise.all([
      supabase.rpc("current_tenant_has_transportadora"),
      supabase.rpc("current_tenant_has_financas"),
      supabase.rpc("current_tenant_has_estoque"),
      supabase.rpc("current_tenant_has_producao"),
    ]);
  const ownerName = (user.user_metadata?.full_name as string | undefined) ?? null;

  return {
    ownerName,
    services: [
      {
        key: "crm",
        name: "CRM",
        description: "Gestão de clientes, vendas e atendimento com agentes de IA.",
        active: crmActive,
        href: crmActive && crmSlug ? `/${crmSlug}/dashboard` : "/choose-plan",
      },
      {
        key: "transportadora",
        name: "Transportadora",
        description: "App de gestão de fretes, clientes e motoristas.",
        active: !!hasTransportadora,
        href: hasTransportadora ? "/app/download" : "/comprar-transportadora",
      },
      {
        key: "financas",
        name: "Finanças",
        description: "Controle financeiro completo — fluxo de caixa, contas e boletos.",
        active: !!hasFinancas,
        href: hasFinancas && crmSlug ? `/${crmSlug}/financeiro` : "/comprar-financas",
      },
      {
        key: "estoque",
        name: "Estoque",
        description: "Controle de estoque, itens, entradas e saídas.",
        active: !!hasEstoque,
        href: hasEstoque && crmSlug ? `/${crmSlug}/estoque` : "/comprar-estoque",
      },
      {
        key: "producao",
        name: "Produção",
        description: "Turnos, máquinas, produtos e apontamento de produção.",
        active: !!hasProducao,
        href: hasProducao && crmSlug ? `/${crmSlug}/producao` : "/comprar-producao",
      },
    ],
  };
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
