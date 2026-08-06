import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, normalizeEmail } from "@/lib/crm/phone";
import { getKommoCredentials, kommoPage, type KommoCredentials } from "@/lib/kommo/client";
import {
  contactDisplayName,
  customFieldsToJson,
  mapFieldType,
  pickFieldByCode,
  unixToIso,
  type KommoCompany,
  type KommoContact,
  type KommoCustomFieldDef,
  type KommoLead,
  type KommoPipeline,
  type KommoUser,
} from "@/lib/kommo/types";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Motor da importação do Kommo. Cada chamada processa UMA página de UMA
 * entidade e agenda a próxima na fila (automation_jobs) — nunca um laço longo,
 * porque a VPS pode reiniciar no meio e a conta do cliente pode ter dezenas de
 * milhares de leads.
 *
 * A ordem das entidades não é estética: cada uma depende do mapa que a
 * anterior alimentou. Lead precisa de contato, contato precisa de empresa e de
 * responsável, e tudo precisa das etapas do funil.
 */
const ENTITY_SEQUENCE = [
  "users",
  "pipelines",
  "contact_fields",
  "lead_fields",
  "companies",
  "contacts",
  "leads",
] as const;

export type KommoEntity = (typeof ENTITY_SEQUENCE)[number];

const PAGE_SIZE = 250;

export type ImportScope = {
  entities?: KommoEntity[];
  /** status_id do Kommo -> pipeline_stages.id do CRM. Definido pelo dono na tela de importação. */
  stageMap?: Record<string, string>;
  /** user id do Kommo -> profiles.id. */
  ownerMap?: Record<string, string>;
  defaultOwnerId?: string;
  defaultStageId?: string;
};

export type ImportStats = Record<string, number>;

type StepResult = { itemsSeen: number; stats: ImportStats };

/**
 * Processa a próxima página da importação. Devolve o estado resultante para o
 * chamador (o cron) só para log — todo o progresso é persistido aqui.
 */
export async function runKommoImportStep(admin: Admin, importId: string): Promise<{ status: string }> {
  const { data: job } = await admin
    .from("kommo_imports")
    .select("id, tenant_id, status, scope, cursor, stats")
    .eq("id", importId)
    .maybeSingle();

  if (!job) return { status: "missing" };
  // Cancelamento é cooperativo: o admin marca 'canceled' e o próximo passo para.
  if (job.status === "canceled" || job.status === "done" || job.status === "failed") {
    return { status: job.status };
  }

  const scope = (job.scope ?? {}) as ImportScope;
  const entities = scope.entities?.length ? scope.entities : [...ENTITY_SEQUENCE];
  const cursor = (job.cursor ?? {}) as { entity?: KommoEntity; page?: number };
  const entity = cursor.entity ?? entities[0];
  const page = cursor.page ?? 1;

  let credentials: KommoCredentials;
  try {
    credentials = await getKommoCredentials(admin, job.tenant_id);
  } catch (err) {
    await failImport(admin, importId, err);
    return { status: "failed" };
  }

  let result: StepResult;
  try {
    result = await runEntityPage(admin, job.tenant_id, credentials, entity, page, scope);
  } catch (err) {
    await failImport(admin, importId, err);
    return { status: "failed" };
  }

  const stats = mergeStats((job.stats ?? {}) as ImportStats, result.stats);

  // Página cheia = provavelmente tem mais. Página curta = acabou esta entidade.
  const hasMorePages = result.itemsSeen >= PAGE_SIZE;
  const nextCursor = hasMorePages
    ? { entity, page: page + 1 }
    : nextEntityCursor(entities, entity);

  if (!nextCursor) {
    await admin
      .from("kommo_imports")
      .update({ status: "done", cursor: {}, stats, finished_at: new Date().toISOString(), error: null })
      .eq("id", importId);
    return { status: "done" };
  }

  await admin
    .from("kommo_imports")
    .update({
      status: "running",
      cursor: nextCursor,
      stats,
      started_at: job.status === "pending" ? new Date().toISOString() : undefined,
    })
    .eq("id", importId);

  await enqueueImportStep(admin, job.tenant_id, importId);
  return { status: "running" };
}

/** Coloca o próximo passo na fila que o cron já processa. */
export async function enqueueImportStep(admin: Admin, tenantId: string, importId: string): Promise<void> {
  await admin.from("automation_jobs").insert({
    tenant_id: tenantId,
    job_type: "kommo_import_page",
    payload: { importId },
  });
}

function nextEntityCursor(
  entities: KommoEntity[],
  current: KommoEntity,
): { entity: KommoEntity; page: number } | null {
  const index = entities.indexOf(current);
  const next = entities[index + 1];
  return next ? { entity: next, page: 1 } : null;
}

function mergeStats(base: ImportStats, delta: ImportStats): ImportStats {
  const merged = { ...base };
  for (const [key, value] of Object.entries(delta)) merged[key] = (merged[key] ?? 0) + value;
  return merged;
}

async function failImport(admin: Admin, importId: string, err: unknown): Promise<void> {
  const message = err instanceof Error ? err.message : "Erro desconhecido na importação";
  await admin
    .from("kommo_imports")
    .update({ status: "failed", error: message, finished_at: new Date().toISOString() })
    .eq("id", importId);
  console.error("kommo import falhou", importId, message);
}

// ─── Mapa Kommo -> CRM ───────────────────────────────────────────────────────

async function mapSet(
  admin: Admin,
  tenantId: string,
  entity: string,
  kommoId: string | number,
  localId: string,
): Promise<void> {
  await admin.from("kommo_entity_map").upsert(
    {
      tenant_id: tenantId,
      entity,
      kommo_id: String(kommoId),
      local_id: localId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,entity,kommo_id" },
  );
}

/** Carrega de uma vez o pedaço do mapa que a página precisa. */
async function mapMany(
  admin: Admin,
  tenantId: string,
  entity: string,
  kommoIds: (string | number)[],
): Promise<Map<string, string>> {
  if (!kommoIds.length) return new Map();

  const { data } = await admin
    .from("kommo_entity_map")
    .select("kommo_id, local_id")
    .eq("tenant_id", tenantId)
    .eq("entity", entity)
    .in("kommo_id", kommoIds.map(String));

  return new Map((data ?? []).map((row) => [row.kommo_id, row.local_id]));
}

// ─── Passos por entidade ─────────────────────────────────────────────────────

async function runEntityPage(
  admin: Admin,
  tenantId: string,
  credentials: KommoCredentials,
  entity: KommoEntity,
  page: number,
  scope: ImportScope,
): Promise<StepResult> {
  switch (entity) {
    case "users":
      return importUsers(admin, tenantId, credentials, page, scope);
    case "pipelines":
      return importPipelines(admin, tenantId, credentials, page, scope);
    case "contact_fields":
      return importCustomFields(admin, tenantId, credentials, page, "contacts", "contact");
    case "lead_fields":
      return importCustomFields(admin, tenantId, credentials, page, "leads", "deal");
    case "companies":
      return importCompanies(admin, tenantId, credentials, page, scope);
    case "contacts":
      return importContacts(admin, tenantId, credentials, page, scope);
    case "leads":
      return importLeads(admin, tenantId, credentials, page, scope);
  }
}

/**
 * Usuários: só monta o mapa "responsável do Kommo -> vendedor do CRM". NÃO
 * cria usuário nenhum — quem entra na conta é decisão do dono (e custa
 * licença). Sem correspondência, o lead cai no responsável padrão escolhido
 * na tela de importação.
 *
 * O casamento automático é só por nome: `profiles` não guarda e-mail (ele vive
 * em auth.users). Por isso a tela de importação deixa o admin ligar cada
 * responsável do Kommo a um vendedor na mão — e esse mapeamento ganha da
 * heurística.
 */
async function importUsers(
  admin: Admin,
  tenantId: string,
  credentials: KommoCredentials,
  page: number,
  scope: ImportScope,
): Promise<StepResult> {
  const users = await kommoPage<KommoUser>(credentials, "/users", "users", page, PAGE_SIZE);
  if (!users.length) return { itemsSeen: 0, stats: {} };

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("tenant_id", tenantId);

  const byName = new Map<string, string>();
  for (const profile of profiles ?? []) {
    if (profile.full_name) byName.set(profile.full_name.trim().toLowerCase(), profile.id);
  }

  let mapped = 0;
  for (const user of users) {
    const explicit = scope.ownerMap?.[String(user.id)];
    const localId =
      explicit ||
      (user.name ? byName.get(user.name.trim().toLowerCase()) : undefined) ||
      scope.defaultOwnerId;

    if (!localId) continue;
    await mapSet(admin, tenantId, "user", user.id, localId);
    mapped++;
  }

  return { itemsSeen: users.length, stats: { usersMapped: mapped } };
}

/**
 * Funis e etapas. O mapeamento vem da tela (o cliente decide onde cada etapa
 * do Kommo cai); o que ele não mapeou é criado no fim do funil, porque perder
 * a etapa de origem é perder a posição do lead.
 */
async function importPipelines(
  admin: Admin,
  tenantId: string,
  credentials: KommoCredentials,
  page: number,
  scope: ImportScope,
): Promise<StepResult> {
  const pipelines = await kommoPage<KommoPipeline>(
    credentials,
    "/leads/pipelines",
    "pipelines",
    page,
    PAGE_SIZE,
  );
  if (!pipelines.length) return { itemsSeen: 0, stats: {} };

  const { data: stages } = await admin
    .from("pipeline_stages")
    .select("id, name, position")
    .eq("tenant_id", tenantId);

  const byName = new Map((stages ?? []).map((s) => [s.name.trim().toLowerCase(), s.id]));
  let nextPosition = (stages ?? []).reduce((max, s) => Math.max(max, s.position ?? 0), 0) + 1;
  let created = 0;

  for (const pipeline of pipelines) {
    await mapSet(admin, tenantId, "pipeline", pipeline.id, tenantId); // marca como visto
    for (const status of pipeline._embedded?.statuses ?? []) {
      const explicit = scope.stageMap?.[String(status.id)];
      if (explicit) {
        await mapSet(admin, tenantId, "status", status.id, explicit);
        continue;
      }

      const name = status.name?.trim() || `Etapa ${status.id}`;
      let stageId = byName.get(name.toLowerCase());

      if (!stageId) {
        const { data: createdStage } = await admin
          .from("pipeline_stages")
          .insert({
            tenant_id: tenantId,
            name,
            position: nextPosition++,
            color: status.color || "#94a3b8",
            is_won: false,
            is_lost: false,
          })
          .select("id")
          .single();
        if (!createdStage) continue;
        stageId = createdStage.id;
        byName.set(name.toLowerCase(), stageId);
        created++;
      }

      await mapSet(admin, tenantId, "status", status.id, stageId);
    }
  }

  return { itemsSeen: pipelines.length, stats: { stagesCreated: created } };
}

/** Definições de campo personalizado -> custom_field_defs. */
async function importCustomFields(
  admin: Admin,
  tenantId: string,
  credentials: KommoCredentials,
  page: number,
  kommoEntity: "contacts" | "leads",
  localEntity: "contact" | "deal",
): Promise<StepResult> {
  const fields = await kommoPage<KommoCustomFieldDef>(
    credentials,
    `/${kommoEntity}/custom_fields`,
    "custom_fields",
    page,
    PAGE_SIZE,
  );
  if (!fields.length) return { itemsSeen: 0, stats: {} };

  let imported = 0;
  for (const field of fields) {
    // Telefone e e-mail viram colunas de verdade no CRM, não campo extra.
    if (field.code === "PHONE" || field.code === "EMAIL") continue;

    const key = `kommo_${field.id}`;
    const { data: saved } = await admin
      .from("custom_field_defs")
      .upsert(
        {
          tenant_id: tenantId,
          entity: localEntity,
          key,
          name: field.name?.trim() || key,
          field_type: mapFieldType(field.type),
          options: (field.enums ?? [])
            .map((e) => e.value?.trim() ?? "")
            .filter((value) => value !== ""),
          source: "kommo",
          external_id: String(field.id),
          position: field.sort ?? 0,
        },
        { onConflict: "tenant_id,entity,key" },
      )
      .select("id")
      .maybeSingle();

    if (saved) {
      await mapSet(admin, tenantId, "custom_field", field.id, saved.id);
      imported++;
    }
  }

  return { itemsSeen: fields.length, stats: { customFieldsImported: imported } };
}

async function importCompanies(
  admin: Admin,
  tenantId: string,
  credentials: KommoCredentials,
  page: number,
  scope: ImportScope,
): Promise<StepResult> {
  const companies = await kommoPage<KommoCompany>(credentials, "/companies", "companies", page, PAGE_SIZE);
  if (!companies.length) return { itemsSeen: 0, stats: {} };

  const existingMap = await mapMany(admin, tenantId, "company", companies.map((c) => c.id));
  const ownerMap = await mapMany(admin, tenantId, "user", companies.map((c) => c.responsible_user_id ?? 0));

  let created = 0;
  let updated = 0;

  for (const company of companies) {
    const name = company.name?.trim();
    if (!name) continue;

    const ownerId = ownerMap.get(String(company.responsible_user_id)) ?? scope.defaultOwnerId;
    if (!ownerId) continue;

    const localId = existingMap.get(String(company.id));
    if (localId) {
      await admin.from("companies").update({ name }).eq("id", localId);
      updated++;
      continue;
    }

    const { data: createdCompany } = await admin
      .from("companies")
      .insert({ tenant_id: tenantId, name, created_by: ownerId })
      .select("id")
      .single();

    if (createdCompany) {
      await mapSet(admin, tenantId, "company", company.id, createdCompany.id);
      created++;
    }
  }

  return { itemsSeen: companies.length, stats: { companiesCreated: created, companiesUpdated: updated } };
}

/**
 * Contatos. É aqui que a anti-duplicidade de 0070_contact_dedupe faz o
 * trabalho: antes de criar, procura pelo telefone normalizado. O mesmo cliente
 * já existente no CRM (porque mandou WhatsApp) é reaproveitado em vez de
 * ganhar uma segunda ficha.
 */
async function importContacts(
  admin: Admin,
  tenantId: string,
  credentials: KommoCredentials,
  page: number,
  scope: ImportScope,
): Promise<StepResult> {
  const contacts = await kommoPage<KommoContact>(credentials, "/contacts", "contacts", page, PAGE_SIZE);
  if (!contacts.length) return { itemsSeen: 0, stats: {} };

  const mapped = await mapMany(admin, tenantId, "contact", contacts.map((c) => c.id));
  const ownerMap = await mapMany(admin, tenantId, "user", contacts.map((c) => c.responsible_user_id ?? 0));
  const companyMap = await mapMany(
    admin,
    tenantId,
    "company",
    contacts.flatMap((c) => (c._embedded?.companies ?? []).map((co) => co.id)),
  );

  let created = 0;
  let updated = 0;
  let matched = 0;

  for (const contact of contacts) {
    const ownerId = ownerMap.get(String(contact.responsible_user_id)) ?? scope.defaultOwnerId;
    if (!ownerId) continue;

    const phone = pickFieldByCode(contact.custom_fields_values, "PHONE");
    const email = pickFieldByCode(contact.custom_fields_values, "EMAIL");
    const companyKommoId = contact._embedded?.companies?.[0]?.id;

    const payload = {
      name: contactDisplayName(contact),
      phone,
      email,
      company_id: companyKommoId ? (companyMap.get(String(companyKommoId)) ?? null) : null,
      custom_fields: customFieldsToJson(contact.custom_fields_values),
    };

    // Já importado antes: atualiza e segue (reimportação é idempotente).
    const knownId = mapped.get(String(contact.id));
    if (knownId) {
      await admin.from("contacts").update(payload).eq("id", knownId);
      updated++;
      continue;
    }

    // Ainda não importado, mas o telefone (ou o e-mail) já existe no CRM:
    // é o mesmo lead, só chegou por outro canal antes.
    const existingId = await findExistingContact(admin, tenantId, phone, email);
    if (existingId) {
      await admin.from("contacts").update(payload).eq("id", existingId);
      await mapSet(admin, tenantId, "contact", contact.id, existingId);
      matched++;
      continue;
    }

    const { data: createdContact } = await admin
      .from("contacts")
      .insert({
        tenant_id: tenantId,
        ...payload,
        lead_source: "Kommo",
        created_by: ownerId,
        created_at: unixToIso(contact.created_at) ?? undefined,
      })
      .select("id")
      .single();

    if (createdContact) {
      await mapSet(admin, tenantId, "contact", contact.id, createdContact.id);
      created++;
    }
  }

  return {
    itemsSeen: contacts.length,
    stats: { contactsCreated: created, contactsUpdated: updated, contactsMatched: matched },
  };
}

async function findExistingContact(
  admin: Admin,
  tenantId: string,
  phone: string | null,
  email: string | null,
): Promise<string | null> {
  const phoneKey = normalizePhone(phone);
  if (phoneKey) {
    const { data } = await admin
      .from("contacts")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("phone_key", phoneKey)
      .maybeSingle();
    if (data) return data.id;
  }

  const emailKey = normalizeEmail(email);
  if (emailKey) {
    const { data } = await admin
      .from("contacts")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("email_key", emailKey)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (data) return data.id;
  }

  return null;
}

/**
 * Leads do Kommo viram negócios do CRM. Um negócio exige contato (contact_id
 * é NOT NULL), então lead sem contato vinculado é contado como pulado em vez
 * de derrubar a importação.
 */
async function importLeads(
  admin: Admin,
  tenantId: string,
  credentials: KommoCredentials,
  page: number,
  scope: ImportScope,
): Promise<StepResult> {
  const leads = await kommoPage<KommoLead>(
    credentials,
    "/leads",
    "leads",
    page,
    PAGE_SIZE,
    "&with=contacts",
  );
  if (!leads.length) return { itemsSeen: 0, stats: {} };

  const mapped = await mapMany(admin, tenantId, "lead", leads.map((l) => l.id));
  const ownerMap = await mapMany(admin, tenantId, "user", leads.map((l) => l.responsible_user_id ?? 0));
  const stageMap = await mapMany(admin, tenantId, "status", leads.map((l) => l.status_id ?? 0));
  const contactMap = await mapMany(
    admin,
    tenantId,
    "contact",
    leads.flatMap((l) => (l._embedded?.contacts ?? []).map((c) => c.id)),
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const lead of leads) {
    const linked = lead._embedded?.contacts ?? [];
    const mainContact = linked.find((c) => c.is_main) ?? linked[0];
    const contactId = mainContact ? contactMap.get(String(mainContact.id)) : undefined;
    if (!contactId) {
      skipped++;
      continue;
    }

    const stageId = stageMap.get(String(lead.status_id)) ?? scope.defaultStageId;
    if (!stageId) {
      skipped++;
      continue;
    }

    const ownerId = ownerMap.get(String(lead.responsible_user_id)) ?? scope.defaultOwnerId;
    if (!ownerId) {
      skipped++;
      continue;
    }

    const payload = {
      title: lead.name?.trim() || `Negócio ${lead.id}`,
      value: typeof lead.price === "number" ? lead.price : 0,
      stage_id: stageId,
      custom_fields: customFieldsToJson(lead.custom_fields_values),
    };

    const knownId = mapped.get(String(lead.id));
    if (knownId) {
      await admin.from("deals").update(payload).eq("id", knownId);
      updated++;
      continue;
    }

    const { data: createdDeal } = await admin
      .from("deals")
      .insert({
        tenant_id: tenantId,
        ...payload,
        contact_id: contactId,
        owner_id: ownerId,
        status: "open",
        position: 0,
        created_at: unixToIso(lead.created_at) ?? undefined,
      })
      .select("id")
      .single();

    if (createdDeal) {
      await mapSet(admin, tenantId, "lead", lead.id, createdDeal.id);
      created++;
    }
  }

  return { itemsSeen: leads.length, stats: { dealsCreated: created, dealsUpdated: updated, dealsSkipped: skipped } };
}
