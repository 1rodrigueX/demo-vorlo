import "server-only";

/**
 * Formato das respostas da API v4 do Kommo, só o que a importação usa.
 * Tudo opcional de propósito: campo desativado na conta do cliente
 * simplesmente não vem, e a importação não pode quebrar por causa disso.
 */

export type KommoFieldValue = {
  field_id?: number;
  field_code?: string | null;
  field_name?: string;
  field_type?: string;
  values?: { value?: unknown; enum_id?: number; enum_code?: string }[];
};

export type KommoUser = { id: number; name?: string; email?: string };

export type KommoStatus = { id: number; name?: string; sort?: number; color?: string; type?: number };

export type KommoPipeline = {
  id: number;
  name?: string;
  sort?: number;
  is_main?: boolean;
  _embedded?: { statuses?: KommoStatus[] };
};

export type KommoCustomFieldDef = {
  id: number;
  name?: string;
  type?: string;
  code?: string | null;
  sort?: number;
  enums?: { id: number; value?: string; sort?: number }[];
};

export type KommoCompany = {
  id: number;
  name?: string;
  responsible_user_id?: number;
  custom_fields_values?: KommoFieldValue[] | null;
};

export type KommoContact = {
  id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  responsible_user_id?: number;
  created_at?: number;
  custom_fields_values?: KommoFieldValue[] | null;
  _embedded?: { companies?: { id: number }[] };
};

export type KommoLead = {
  id: number;
  name?: string;
  price?: number;
  status_id?: number;
  pipeline_id?: number;
  responsible_user_id?: number;
  created_at?: number;
  closed_at?: number | null;
  custom_fields_values?: KommoFieldValue[] | null;
  _embedded?: { contacts?: { id: number; is_main?: boolean }[]; companies?: { id: number }[] };
};

/**
 * Telefone e e-mail no Kommo são campos personalizados com code PHONE/EMAIL,
 * não colunas — é o erro mais comum de quem integra com essa API.
 */
export function pickFieldByCode(fields: KommoFieldValue[] | null | undefined, code: string): string | null {
  const field = (fields ?? []).find((f) => f.field_code === code);
  const value = field?.values?.[0]?.value;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Nome legível de um contato do Kommo, que pode vir só em first/last_name. */
export function contactDisplayName(contact: KommoContact): string {
  const full = [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim();
  return contact.name?.trim() || full || `Contato ${contact.id}`;
}

/**
 * Achata os campos personalizados num objeto pro jsonb `custom_fields`.
 * PHONE/EMAIL ficam de fora: viram colunas de verdade no CRM.
 */
export function customFieldsToJson(fields: KommoFieldValue[] | null | undefined): Record<string, string> {
  const result: Record<string, string> = {};

  for (const field of fields ?? []) {
    if (!field.field_id) continue;
    if (field.field_code === "PHONE" || field.field_code === "EMAIL") continue;

    const values = (field.values ?? [])
      .map((v) => (v.value == null ? "" : String(v.value).trim()))
      .filter(Boolean);

    // Multiselect vira texto separado por vírgula — o CRM guarda o valor
    // legível, não os enum_id do Kommo (que não significam nada aqui).
    if (values.length) result[`kommo_${field.field_id}`] = values.join(", ");
  }

  return result;
}

/** Unix em segundos -> ISO. */
export function unixToIso(seconds: number | null | undefined): string | null {
  if (!seconds || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

/** Tipo de campo do Kommo -> tipo do custom_field_defs. */
export function mapFieldType(kommoType: string | undefined): string {
  switch (kommoType) {
    case "numeric":
    case "price":
      return "number";
    case "date":
    case "date_time":
    case "birthday":
      return "date";
    case "select":
    case "radiobutton":
      return "select";
    case "multiselect":
    case "checkbox_group":
      return "multiselect";
    case "checkbox":
      return "checkbox";
    case "url":
      return "url";
    case "textarea":
      return "textarea";
    default:
      return "text";
  }
}
