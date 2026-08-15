import "server-only";
import type OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncContactToBling, updateBlingContactVendedor } from "@/lib/bling/sync";
import { resolveBlingConnectionId } from "@/lib/bling/resolveConnection";
import { ensureSellerTag } from "@/lib/tags/ensureTag";
import { moveLeadToQualificationStage } from "@/lib/ai-agents/sdrPipelineStage";

/** Única ferramenta exposta ao SDR na conversa automática com o lead pelo WhatsApp. */
export const COMPLETE_LEAD_REGISTRATION_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "complete_lead_registration",
    description:
      "Conclui o cadastro do lead depois de coletar os dados necessários na conversa. Chame só quando já tiver " +
      "confirmado o nome completo e o CPF/CNPJ com a pessoa — os outros campos são opcionais, colete o que " +
      "conseguir naturalmente na conversa. Além do cadastro, essa chamada também move o lead no pipeline pra " +
      "'Qualificado' ou 'Não Qualificado' — avalie com sinceridade se a pessoa tem interesse e perfil reais de " +
      "compra (não force qualificação positiva só pra ser gentil).",
    parameters: {
      type: "object",
      properties: {
        fullName: { type: "string", description: "Nome completo confirmado pelo lead" },
        cpfCnpj: { type: "string", description: "CPF (11 dígitos) ou CNPJ (14 dígitos), só números" },
        email: { type: "string", description: "E-mail do lead, se informado" },
        addressZip: { type: "string", description: "CEP, se informado" },
        addressStreet: { type: "string", description: "Rua/logradouro, se informado" },
        addressNumber: { type: "string", description: "Número, se informado" },
        addressComplement: { type: "string", description: "Complemento, se informado" },
        addressNeighborhood: { type: "string", description: "Bairro, se informado" },
        addressCity: { type: "string", description: "Cidade, se informada" },
        addressState: { type: "string", description: "UF (2 letras), se informada" },
        qualified: {
          type: "boolean",
          description:
            "true se o lead tem interesse e perfil reais pra virar oportunidade de venda (sabe o que precisa, " +
            "demanda plausível); false se claramente não é um lead viável agora (só curiosidade, fora da área de " +
            "atuação, sem intenção real de compra).",
        },
        qualificationNote: {
          type: "string",
          description: "Resumo de 1 frase do motivo da avaliação, pro vendedor humano entender o contexto rápido.",
        },
      },
      required: ["fullName", "cpfCnpj", "qualified"],
    },
  },
};

type Admin = ReturnType<typeof createAdminClient>;

export async function executeCompleteLeadRegistration(
  admin: Admin,
  tenantId: string,
  contactId: string,
  sellerId: string,
  input: Record<string, unknown>,
): Promise<{ content: string; isError: boolean }> {
  const fullName = String(input.fullName ?? "").trim();
  const cpfCnpjDigits = String(input.cpfCnpj ?? "").replace(/\D/g, "");

  if (!fullName || (cpfCnpjDigits.length !== 11 && cpfCnpjDigits.length !== 14)) {
    return { content: "Nome completo e um CPF (11 dígitos) ou CNPJ (14 dígitos) válidos são obrigatórios.", isError: true };
  }

  const email = input.email ? String(input.email).trim() : null;
  const address = {
    zip: input.addressZip ? String(input.addressZip).trim() : null,
    street: input.addressStreet ? String(input.addressStreet).trim() : null,
    number: input.addressNumber ? String(input.addressNumber).trim() : null,
    complement: input.addressComplement ? String(input.addressComplement).trim() : null,
    neighborhood: input.addressNeighborhood ? String(input.addressNeighborhood).trim() : null,
    city: input.addressCity ? String(input.addressCity).trim() : null,
    state: input.addressState ? String(input.addressState).trim() : null,
  };

  const { data: contact } = await admin
    .from("contacts")
    .select("id, name, phone, email")
    .eq("id", contactId)
    .single();

  if (!contact) return { content: "Contato não encontrado.", isError: true };

  await admin
    .from("contacts")
    .update({
      name: fullName || contact.name,
      cpf_cnpj: cpfCnpjDigits,
      email: email || contact.email,
      address_zip: address.zip,
      address_street: address.street,
      address_number: address.number,
      address_complement: address.complement,
      address_neighborhood: address.neighborhood,
      address_city: address.city,
      address_state: address.state,
      needs_registration: false,
    })
    .eq("id", contactId);

  const blingResult = await syncContactToBling(tenantId, {
    id: contactId,
    name: fullName || contact.name,
    phone: contact.phone,
    email: email || contact.email,
    cpfCnpj: cpfCnpjDigits,
    address,
  });

  const sellerTagId = await ensureSellerTag(admin, tenantId, sellerId);
  if (sellerTagId) {
    await admin.from("contact_tags").upsert(
      { contact_id: contactId, tag_id: sellerTagId, tenant_id: tenantId },
      { onConflict: "contact_id,tag_id", ignoreDuplicates: true },
    );
  }

  const qualified = input.qualified !== false;
  const qualificationNote = input.qualificationNote ? String(input.qualificationNote).trim() : null;
  await moveLeadToQualificationStage(
    admin,
    tenantId,
    contactId,
    sellerId,
    fullName || contact.name,
    qualified,
    qualificationNote,
  );

  // Best-effort: só tenta refletir o vendedor dentro do Bling se o admin já
  // mapeou esse vendedor do CRM pra um vendedor cadastrado no Bling.
  if (blingResult.success) {
    const connectionId = await resolveBlingConnectionId(tenantId, contactId);
    if (connectionId) {
      const { data: mapping } = await admin
        .from("bling_connection_sellers")
        .select("bling_vendedor_id")
        .eq("bling_connection_id", connectionId)
        .eq("profile_id", sellerId)
        .maybeSingle();

      if (mapping?.bling_vendedor_id) {
        await updateBlingContactVendedor(connectionId, blingResult.blingId, mapping.bling_vendedor_id);
      }
    }
  }

  if (!blingResult.success) {
    return {
      content: `Cadastro salvo no CRM, mas não foi possível registrar no Bling agora: ${blingResult.error}. Diga ao lead que o cadastro foi recebido com sucesso.`,
      isError: false,
    };
  }

  return {
    content: `Cadastro concluído e registrado no Bling (id ${blingResult.blingId}). Agradeça ao lead e informe que um vendedor vai continuar o atendimento.`,
    isError: false,
  };
}
