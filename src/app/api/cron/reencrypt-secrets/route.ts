import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret, isEncrypted } from "@/lib/crypto/secrets";

/**
 * Backfill único: cifra segredos que ainda estão em texto puro no banco (ex:
 * chaves salvas antes de ligar a criptografia). Idempotente — pula o que já
 * está cifrado. Protegido pelo mesmo x-cron-secret dos outros crons; rodar via
 * curl a partir da VPS. Exige SECRETS_ENC_KEY configurada (senão encryptSecret
 * seria no-op e não cifraria nada).
 */
export async function POST(request: Request) {
  const cronSecret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!process.env.SECRETS_ENC_KEY) {
    return NextResponse.json({ error: "SECRETS_ENC_KEY não configurada — nada a cifrar" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("tenant_integrations")
    .select("id, credentials")
    .eq("provider", "anthropic");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let encrypted = 0;
  let skipped = 0;
  for (const row of rows ?? []) {
    const creds = (row.credentials as { apiKey?: string } | null) ?? null;
    const apiKey = creds?.apiKey;
    if (!apiKey || isEncrypted(apiKey)) {
      skipped++;
      continue;
    }
    const { error: upErr } = await admin
      .from("tenant_integrations")
      .update({ credentials: { ...creds, apiKey: encryptSecret(apiKey) } })
      .eq("id", row.id);
    if (!upErr) encrypted++;
  }

  return NextResponse.json({ ok: true, total: rows?.length ?? 0, encrypted, skipped });
}
