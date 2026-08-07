/**
 * Copia os arquivos do Storage do Supabase para o disco local, antes de virar
 * STORAGE_DRIVER para "local".
 *
 * Por que existe: trocar o backend sem levar os arquivos junto quebraria todo
 * logo, catálogo e anexo já enviados. Este script é o passo do meio.
 *
 *   node scripts/migrate-storage.mjs           → copia tudo
 *   node scripts/migrate-storage.mjs --dry-run → só lista o que copiaria
 *
 * É seguro rodar mais de uma vez: arquivo que já existe no destino é pulado.
 */
import { createClient } from "@supabase/supabase-js";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });

const BUCKETS = ["company-assets", "contact-attachments", "backups"];
const dryRun = process.argv.includes("--dry-run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const root = process.env.STORAGE_ROOT || path.join(process.cwd(), ".storage");

if (!url || !serviceKey) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

/** O list() do Supabase não é recursivo — pastas viram entradas sem id. */
async function walk(bucket, prefix = "") {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) {
    console.error(`  erro ao listar ${bucket}/${prefix}: ${error.message}`);
    return [];
  }

  const files = [];
  for (const entry of data ?? []) {
    const full = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id) files.push(full);
    else files.push(...(await walk(bucket, full)));
  }
  return files;
}

let copied = 0;
let skipped = 0;
let failed = 0;

for (const bucket of BUCKETS) {
  console.log(`\n${bucket}`);
  const files = await walk(bucket);
  console.log(`  ${files.length} arquivos`);

  for (const objectPath of files) {
    const target = path.join(root, bucket, objectPath);

    try {
      await stat(target);
      skipped++;
      continue;
    } catch {
      // Não existe no destino — segue e copia.
    }

    if (dryRun) {
      console.log(`  copiaria: ${objectPath}`);
      copied++;
      continue;
    }

    const { data, error } = await supabase.storage.from(bucket).download(objectPath);
    if (error || !data) {
      console.error(`  falhou: ${objectPath} — ${error?.message ?? "sem conteúdo"}`);
      failed++;
      continue;
    }

    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(await data.arrayBuffer()));
    copied++;
  }
}

console.log(
  `\n${dryRun ? "[simulação] " : ""}${copied} copiados, ${skipped} já existiam, ${failed} falharam.`,
);
console.log(`Destino: ${root}`);
if (failed > 0) process.exit(1);
