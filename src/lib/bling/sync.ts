import "server-only";
import { blingFetch } from "@/lib/bling/client";
import { resolveBlingConnectionId } from "@/lib/bling/resolveConnection";
import { createAdminClient } from "@/lib/supabase/admin";

type BlingApiResponse = { data?: { id?: number | string } };

export type BlingSyncResult =
  | { success: true; blingId: string }
  | { success: false; error: string };

/**
 * O Bling só aceita o celular formatado como "(DDD) XXXXX-XXXX" (ou
 * "(DDD) XXXX-XXXX" pra número de 8 dígitos) — nem dígitos puros nem o "+55"
 * do padrão E.164 que a gente guarda no CRM passam na validação dele.
 */
function toBlingCelular(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.length > 11 && digits.startsWith("55") ? digits.slice(2) : digits;

  const ddd = local.slice(0, 2);
  const rest = local.slice(2);
  const splitAt = rest.length === 9 ? 5 : 4;

  return `(${ddd}) ${rest.slice(0, splitAt)}-${rest.slice(splitAt)}`;
}

type BlingContactAddress = {
  zip: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
};

/**
 * Cadastra o contato no Bling como cliente. Usada tanto automaticamente (ao
 * criar o contato, sem travar o CRM se o Bling recusar) quanto sob demanda
 * pelo assistente de IA (que precisa saber se deu certo pra responder o
 * vendedor).
 */
export async function syncContactToBling(
  tenantId: string,
  contact: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    cpfCnpj?: string | null;
    address?: BlingContactAddress | null;
  },
): Promise<BlingSyncResult> {
  try {
    const connectionId = await resolveBlingConnectionId(tenantId, contact.id);
    if (!connectionId) {
      return { success: false, error: "Nenhuma conexão com o Bling configurada pra este contato" };
    }

    const documentDigits = contact.cpfCnpj?.replace(/\D/g, "") || null;
    const address = contact.address;
    const hasAddress = !!(
      address &&
      (address.zip || address.street || address.number || address.neighborhood || address.city || address.state)
    );

    const body = {
      nome: contact.name,
      // CNPJ tem 14 dígitos, CPF tem 11 — na dúvida (documento vazio/incompleto) assume Pessoa Física.
      tipo: documentDigits?.length === 14 ? "J" : "F",
      situacao: "A",
      ...(contact.phone ? { celular: toBlingCelular(contact.phone) } : {}),
      ...(contact.email ? { email: contact.email } : {}),
      ...(documentDigits ? { numeroDocumento: documentDigits } : {}),
      ...(hasAddress
        ? {
            endereco: {
              geral: {
                ...(address!.zip ? { cep: address!.zip.replace(/\D/g, "") } : {}),
                ...(address!.street ? { endereco: address!.street } : {}),
                ...(address!.number ? { numero: address!.number } : {}),
                ...(address!.complement ? { complemento: address!.complement } : {}),
                ...(address!.neighborhood ? { bairro: address!.neighborhood } : {}),
                ...(address!.city ? { municipio: address!.city } : {}),
                ...(address!.state ? { uf: address!.state.toUpperCase() } : {}),
              },
            },
          }
        : {}),
    };

    const result = (await blingFetch(connectionId, "/contatos", {
      method: "POST",
      body: JSON.stringify(body),
    })) as BlingApiResponse;

    const blingContactId = result?.data?.id != null ? String(result.data.id) : null;
    if (!blingContactId) {
      return { success: false, error: "Bling não retornou um id de contato" };
    }

    const admin = createAdminClient();
    await admin.from("contacts").update({ bling_contact_id: blingContactId }).eq("id", contact.id);

    return { success: true, blingId: blingContactId };
  } catch (err) {
    console.error(`Bling: falha ao sincronizar contato ${contact.id}`, err);
    return { success: false, error: err instanceof Error ? err.message : "erro desconhecido" };
  }
}

/**
 * Atualiza o vendedor do contato dentro do Bling (best-effort — se não
 * houver mapeamento vendedor-do-CRM -> vendedor-no-Bling configurado em
 * Configurações > Bling, o chamador simplesmente não invoca esta função).
 */
export async function updateBlingContactVendedor(
  connectionId: string,
  blingContactId: string,
  blingVendedorId: string,
): Promise<BlingSyncResult> {
  try {
    await blingFetch(connectionId, `/contatos/${blingContactId}`, {
      method: "PATCH",
      body: JSON.stringify({ vendedor: { id: Number(blingVendedorId) } }),
    });
    return { success: true, blingId: blingContactId };
  } catch (err) {
    console.error(`Bling: falha ao atualizar vendedor do contato ${blingContactId}`, err);
    return { success: false, error: err instanceof Error ? err.message : "erro desconhecido" };
  }
}

/**
 * Cria um pedido de venda no Bling representando a proposta enviada.
 * Exige que o contato já tenha sido sincronizado antes (contact.bling_contact_id).
 */
export async function createBlingOrderForDeal(
  tenantId: string,
  deal: { id: string; title: string; value: number; contactId: string },
  contactBlingId: string,
): Promise<BlingSyncResult> {
  try {
    const connectionId = await resolveBlingConnectionId(tenantId, deal.contactId);
    if (!connectionId) {
      return { success: false, error: "Nenhuma conexão com o Bling configurada pra este contato" };
    }

    const body = {
      contato: { id: Number(contactBlingId) },
      itens: [
        {
          descricao: deal.title,
          quantidade: 1,
          valor: deal.value,
        },
      ],
    };

    const result = (await blingFetch(connectionId, "/pedidos/vendas", {
      method: "POST",
      body: JSON.stringify(body),
    })) as BlingApiResponse;

    const blingOrderId = result?.data?.id != null ? String(result.data.id) : null;
    if (!blingOrderId) {
      return { success: false, error: "Bling não retornou um id de pedido" };
    }

    const admin = createAdminClient();
    await admin.from("deals").update({ bling_order_id: blingOrderId }).eq("id", deal.id);

    return { success: true, blingId: blingOrderId };
  } catch (err) {
    console.error(`Bling: falha ao criar pedido pro negócio ${deal.id}`, err);
    return { success: false, error: err instanceof Error ? err.message : "erro desconhecido" };
  }
}
