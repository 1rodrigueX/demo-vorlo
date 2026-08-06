"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantId } from "@/lib/auth/current-user";
import { encryptSecret } from "@/lib/crypto/secrets";
import {
  getKommoCredentials,
  kommoPage,
  parseSubdomain,
  testKommoCredentials,
  type KommoCredentials,
} from "@/lib/kommo/client";
import type { KommoPipeline, KommoUser } from "@/lib/kommo/types";
import { enqueueImportStep, type ImportScope } from "@/lib/kommo/import";

export type ActionState = { error?: string } | null;

const connectSchema = z.object({
  subdomain: z.string().trim().min(1, "Informe o subdomínio do Kommo"),
  token: z.string().trim().min(20, "Cole o token de acesso de longa duração do Kommo"),
});

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Sessão + tenant + exigência de admin, repetido em toda action deste arquivo.
 * União discriminada por `ok` (e não pela presença de `error`) pra o
 * estreitamento de tipo funcionar em todos os pontos de uso.
 */
type AdminContext =
  | { ok: false; error: string }
  | { ok: true; supabase: SupabaseServerClient; tenantId: string; userId: string };

async function requireAdminTenant(): Promise<AdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada, faça login novamente" };

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return { ok: false, error: "Tenant não encontrado" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile && !["owner", "manager"].includes(profile.role)) {
    return { ok: false, error: "Só o dono ou um gerente pode configurar a importação" };
  }

  return { ok: true, supabase, tenantId, userId: user.id };
}

/**
 * Salva subdomínio + token e já testa. O token é de longa duração e vale por
 * toda a conta do Kommo, então vai cifrado (AES-256-GCM) igual à chave da
 * Anthropic — ver crypto/secrets.
 */
export async function saveKommoConnection(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = connectSchema.safeParse({
    subdomain: formData.get("subdomain"),
    token: formData.get("token"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const ctx = await requireAdminTenant();
  if (!ctx.ok) return { error: ctx.error };

  const subdomain = parseSubdomain(parsed.data.subdomain);
  if (!subdomain) return { error: "Subdomínio inválido" };

  const test = await testKommoCredentials({ subdomain, token: parsed.data.token });
  const now = new Date().toISOString();

  const { data: existing } = await ctx.supabase
    .from("tenant_integrations")
    .select("id")
    .eq("tenant_id", ctx.tenantId)
    .eq("provider", "kommo")
    .maybeSingle();

  const payload = {
    tenant_id: ctx.tenantId,
    provider: "kommo" as const,
    name: test.ok ? test.accountName : subdomain,
    credentials: { subdomain },
    access_token: encryptSecret(parsed.data.token),
    status: test.ok ? ("connected" as const) : ("error" as const),
    connected_at: test.ok ? now : null,
    last_tested_at: now,
    last_error: test.ok ? null : test.error,
    updated_at: now,
  };

  const { error } = existing
    ? await ctx.supabase.from("tenant_integrations").update(payload).eq("id", existing.id)
    : await ctx.supabase.from("tenant_integrations").insert(payload);

  if (error) {
    console.error("saveKommoConnection failed:", error);
    return { error: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/[tenantSlug]/settings/integracoes", "page");
  if (!test.ok) return { error: `Dados salvos, mas a conexão falhou: ${test.error}` };
  return null;
}

export async function testKommoConnection(): Promise<ActionState> {
  const ctx = await requireAdminTenant();
  if (!ctx.ok) return { error: ctx.error };

  const admin = createAdminClient();
  let credentials: KommoCredentials;
  try {
    credentials = await getKommoCredentials(admin, ctx.tenantId);
  } catch {
    return { error: "Kommo ainda não conectado" };
  }

  const test = await testKommoCredentials(credentials);
  await ctx.supabase
    .from("tenant_integrations")
    .update({
      status: test.ok ? "connected" : "error",
      last_tested_at: new Date().toISOString(),
      last_error: test.ok ? null : test.error,
    })
    .eq("tenant_id", ctx.tenantId)
    .eq("provider", "kommo");

  revalidatePath("/[tenantSlug]/settings/integracoes", "page");
  return test.ok ? null : { error: `Teste falhou: ${test.error}` };
}

export async function disconnectKommo(): Promise<ActionState> {
  const ctx = await requireAdminTenant();
  if (!ctx.ok) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("tenant_integrations")
    .delete()
    .eq("tenant_id", ctx.tenantId)
    .eq("provider", "kommo");

  if (error) return { error: "Não foi possível desconectar" };

  revalidatePath("/[tenantSlug]/settings/integracoes", "page");
  return null;
}

export type KommoPreview = {
  accountName: string;
  users: { id: string; name: string }[];
  stages: { id: string; name: string; pipelineName: string }[];
};

/**
 * Lê funis e usuários do Kommo pra montar a tela de mapeamento. É o que evita
 * a importação chegar com todo lead na coluna errada — mapear etapa é decisão
 * do cliente, não adivinhação nossa.
 */
export async function loadKommoPreview(): Promise<{ error: string } | KommoPreview> {
  const ctx = await requireAdminTenant();
  if (!ctx.ok) return { error: ctx.error };

  const admin = createAdminClient();
  let credentials: KommoCredentials;
  try {
    credentials = await getKommoCredentials(admin, ctx.tenantId);
  } catch {
    return { error: "Conecte o Kommo antes de importar" };
  }

  try {
    const [pipelines, users] = await Promise.all([
      kommoPage<KommoPipeline>(credentials, "/leads/pipelines", "pipelines", 1, 250),
      kommoPage<KommoUser>(credentials, "/users", "users", 1, 250),
    ]);

    return {
      accountName: credentials.subdomain,
      users: users.map((u) => ({ id: String(u.id), name: u.name?.trim() || u.email || `Usuário ${u.id}` })),
      stages: pipelines.flatMap((pipeline) =>
        (pipeline._embedded?.statuses ?? []).map((status) => ({
          id: String(status.id),
          name: status.name?.trim() || `Etapa ${status.id}`,
          pipelineName: pipeline.name?.trim() || "Funil",
        })),
      ),
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não foi possível ler os dados do Kommo" };
  }
}

/**
 * Cria a importação e enfileira o primeiro passo. Retorna na hora — quem faz o
 * trabalho é o cron (run-automations), então a tela só acompanha o progresso.
 */
export async function startKommoImport(scope: ImportScope): Promise<{ error?: string; importId?: string }> {
  const ctx = await requireAdminTenant();
  if (!ctx.ok) return { error: ctx.error };

  if (!scope.defaultOwnerId) return { error: "Escolha o responsável padrão dos leads importados" };

  // Duas importações simultâneas no mesmo CRM brigariam pelo mesmo mapa.
  const { data: running } = await ctx.supabase
    .from("kommo_imports")
    .select("id")
    .eq("tenant_id", ctx.tenantId)
    .in("status", ["pending", "running"])
    .maybeSingle();

  if (running) return { error: "Já existe uma importação em andamento" };

  const { data: created, error } = await ctx.supabase
    .from("kommo_imports")
    .insert({
      tenant_id: ctx.tenantId,
      status: "pending",
      scope,
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("startKommoImport failed:", error);
    return { error: "Não foi possível iniciar a importação" };
  }

  const admin = createAdminClient();
  await enqueueImportStep(admin, ctx.tenantId, created.id);

  revalidatePath("/[tenantSlug]/settings/integracoes/kommo", "page");
  return { importId: created.id };
}

/** Cancelamento cooperativo: o próximo passo lê o status e para. */
export async function cancelKommoImport(importId: string): Promise<ActionState> {
  const ctx = await requireAdminTenant();
  if (!ctx.ok) return { error: ctx.error };

  const { error } = await ctx.supabase
    .from("kommo_imports")
    .update({ status: "canceled", finished_at: new Date().toISOString() })
    .eq("id", importId)
    .eq("tenant_id", ctx.tenantId)
    .in("status", ["pending", "running"]);

  if (error) return { error: "Não foi possível cancelar" };

  revalidatePath("/[tenantSlug]/settings/integracoes/kommo", "page");
  return null;
}
