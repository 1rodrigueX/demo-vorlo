import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteObject, listObjects, putObject } from "@/lib/storage";

// ⚠️ Com STORAGE_DRIVER=local o backup passa a viver no MESMO disco do
// servidor. Perder a máquina passa a significar perder banco e backup juntos —
// que é justamente o cenário que backup existe pra cobrir. Antes de virar a
// chave, aponte este bucket pra fora (S3/Backblaze) ou copie os arquivos pra
// outro lugar por cron.
const BACKUP_BUCKET = "backups" as const;
const RETENTION_COUNT = 14;

// Dados de negócio — não inclui tabelas de plataforma (billing_plans,
// transportadora_plans, platform_tutorial_videos etc.), só o que é
// específico de cada tenant/usuário e não tem como recriar sozinho.
const TABLES = [
  "tenants", "profiles", "companies", "contacts", "deals", "pipeline_stages",
  "whatsapp_messages", "activities", "chat_messages", "ai_agents",
  "ai_agent_messages", "ai_agent_memory", "ai_agent_logs", "email_messages",
  "tags", "contact_tags", "whatsapp_connections", "bling_connections",
  "tenant_integrations", "transportadora_clientes", "transportadora_motoristas",
  "transportadora_fretes", "transportadora_configuracoes", "tenant_products",
  "transportadora_pending_checkouts", "lead_webhooks", "automation_jobs",
  "contact_attachments", "tenant_company_profile", "company_catalogs",
  "company_product_photos", "pending_checkouts",
] as const;

/**
 * Backup diário das tabelas de negócio pra um bucket privado do Supabase
 * Storage — segunda linha de defesa além do PITR do próprio plano do
 * Supabase (cobre também erro humano/automação rodando update em massa por
 * engano, não só desastre de infra). Mesmo padrão de cron das outras rotas
 * (segredo compartilhado, chamado pelo crontab da VPS), 1x/dia.
 */
export async function POST(request: Request) {
  const cronSecret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const dump: Record<string, unknown> = {};

  for (const table of TABLES) {
    const { data, error } = await admin.from(table).select("*");
    dump[table] = error ? { error: error.message } : data;
  }

  const { data: usersPage, error: usersError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  dump["auth.users"] = usersError
    ? { error: usersError.message }
    : usersPage.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        user_metadata: u.user_metadata,
      }));

  const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const { error: uploadError } = await putObject(
    BACKUP_BUCKET,
    fileName,
    Buffer.from(JSON.stringify(dump)),
    "application/json",
  );

  if (uploadError) {
    console.error("cron/backup: upload falhou", uploadError);
    return NextResponse.json({ error: uploadError }, { status: 500 });
  }

  // Poda os mais antigos, mantendo só os últimos RETENTION_COUNT.
  const existing = await listObjects(BACKUP_BUCKET);
  const stale = existing.slice(RETENTION_COUNT).map((f) => f.name);
  for (const name of stale) {
    await deleteObject(BACKUP_BUCKET, name);
  }

  return NextResponse.json({ ok: true, file: fileName, pruned: stale.length });
}
