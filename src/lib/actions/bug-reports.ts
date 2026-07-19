"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantId, isCurrentUserDev } from "@/lib/auth/current-user";
import { notifyNewBugReport } from "@/lib/discord/notify";
import { bugReportSchema } from "@/lib/validation/bug-report";

export type ActionState = { error?: string } | null;

export async function submitBugReport(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = bugReportSchema.safeParse({
    message: formData.get("message"),
    severity: formData.get("severity"),
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

  const [{ data: profile }, { data: tenant }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("tenants").select("name").eq("id", tenantId).maybeSingle(),
  ]);
  const authorName = profile?.full_name ?? user.email ?? "usuário";

  const { error } = await supabase.from("bug_reports").insert({
    tenant_id: tenantId,
    created_by: user.id,
    created_by_name: authorName,
    message: parsed.data.message,
    severity: parsed.data.severity,
  });

  if (error) return { error: `Não foi possível enviar: ${error.message}` };
  void notifyNewBugReport(tenant?.name ?? "Empresa", authorName, parsed.data.severity, parsed.data.message);

  revalidatePath("/[tenantSlug]/bugs", "page");
  return null;
}

/** Bugs reportados pelo próprio tenant (histórico + respostas). */
export async function listOwnBugReports() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const tenantId = await requireTenantId(supabase, user.id);
  if (!tenantId) return [];

  const { data } = await supabase
    .from("bug_reports")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

/** Todos os bugs de todos os tenants — só pro painel /dev. */
export async function listAllBugReports() {
  if (!(await isCurrentUserDev())) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("bug_reports")
    .select("*, tenant:tenants(name)")
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function respondToBugReport(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isCurrentUserDev())) {
    return { error: "Acesso restrito a devs da plataforma" };
  }

  const bugId = String(formData.get("bugId") ?? "");
  const response = String(formData.get("response") ?? "").trim();
  if (!bugId) return { error: "Bug inválido" };
  if (!response) return { error: "Escreva uma resposta" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("bug_reports")
    .update({ response, status: "answered", responded_at: new Date().toISOString() })
    .eq("id", bugId);

  if (error) return { error: "Não foi possível salvar a resposta" };

  revalidatePath("/dev/bugs");
  return null;
}
