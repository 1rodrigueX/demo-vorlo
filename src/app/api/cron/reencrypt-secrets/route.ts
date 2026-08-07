import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/security/cronAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret, isEncrypted } from "@/lib/crypto/secrets";
import type { Database } from "@/types/database.types";

type IntegrationUpdate = Database["public"]["Tables"]["tenant_integrations"]["Update"];
type BlingUpdate = Database["public"]["Tables"]["bling_connections"]["Update"];

/**
 * Backfill único: cifra segredos que ainda estão em texto puro no banco (ex:
 * chaves salvas antes de ligar a criptografia). Idempotente — pula o que já
 * está cifrado. Protegido pelo mesmo x-cron-secret dos outros crons; rodar via
 * curl a partir da VPS. Exige SECRETS_ENC_KEY configurada (senão encryptSecret
 * seria no-op e não cifraria nada).
 */
export async function POST(request: Request) {
  if (!verifyCronSecret(request, "reencrypt-secrets")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!process.env.SECRETS_ENC_KEY) {
    return NextResponse.json({ error: "SECRETS_ENC_KEY não configurada — nada a cifrar" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("tenant_integrations")
    .select("id, credentials, access_token, refresh_token");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let encrypted = 0;
  let skipped = 0;
  for (const row of rows ?? []) {
    const update: IntegrationUpdate = {};

    // credenciais em JSONB (ex: chave Anthropic em credentials.apiKey)
    const creds = (row.credentials as { apiKey?: string } | null) ?? null;
    if (creds?.apiKey && !isEncrypted(creds.apiKey)) {
      update.credentials = { ...creds, apiKey: encryptSecret(creds.apiKey) };
    }
    // tokens OAuth (Gmail/Outlook) nas colunas dedicadas
    if (row.access_token && !isEncrypted(row.access_token)) {
      update.access_token = encryptSecret(row.access_token);
    }
    if (row.refresh_token && !isEncrypted(row.refresh_token)) {
      update.refresh_token = encryptSecret(row.refresh_token);
    }

    if (Object.keys(update).length === 0) {
      skipped++;
      continue;
    }
    const { error: upErr } = await admin.from("tenant_integrations").update(update).eq("id", row.id);
    if (!upErr) encrypted++;
  }

  // Conexões Bling (tabela separada): client_secret + tokens OAuth.
  const { data: blingRows } = await admin
    .from("bling_connections")
    .select("id, client_secret, access_token, refresh_token");

  let blingEncrypted = 0;
  for (const row of blingRows ?? []) {
    const update: BlingUpdate = {};
    if (row.client_secret && !isEncrypted(row.client_secret)) update.client_secret = encryptSecret(row.client_secret);
    if (row.access_token && !isEncrypted(row.access_token)) update.access_token = encryptSecret(row.access_token);
    if (row.refresh_token && !isEncrypted(row.refresh_token)) update.refresh_token = encryptSecret(row.refresh_token);
    if (Object.keys(update).length === 0) {
      skipped++;
      continue;
    }
    const { error: upErr } = await admin.from("bling_connections").update(update).eq("id", row.id);
    if (!upErr) blingEncrypted++;
  }

  return NextResponse.json({
    ok: true,
    tenant_integrations: { total: rows?.length ?? 0, encrypted },
    bling_connections: { total: blingRows?.length ?? 0, encrypted: blingEncrypted },
    skipped,
  });
}
