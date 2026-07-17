"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTenantId } from "@/lib/auth/current-user";
import { updateWhatsAppConnectionSchema } from "@/lib/validation/whatsapp-connection";

export type ActionState = { error?: string } | null;

export async function updateWhatsAppConnection(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const provider = formData.get("provider");

  const parsed = updateWhatsAppConnectionSchema.safeParse(
    provider === "twilio"
      ? {
          provider: "twilio",
          twilioAccountSid: formData.get("twilioAccountSid"),
          twilioAuthToken: formData.get("twilioAuthToken"),
          twilioWhatsappNumber: formData.get("twilioWhatsappNumber"),
        }
      : { provider: "baileys" },
  );

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

  const { data, error } = await supabase
    .from("whatsapp_connections")
    .update(
      parsed.data.provider === "twilio"
        ? {
            provider: "twilio",
            twilio_account_sid: parsed.data.twilioAccountSid,
            twilio_auth_token: parsed.data.twilioAuthToken,
            twilio_whatsapp_number: parsed.data.twilioWhatsappNumber,
            updated_at: new Date().toISOString(),
          }
        : { provider: "baileys", updated_at: new Date().toISOString() },
    )
    .eq("tenant_id", tenantId)
    .select("tenant_id")
    .maybeSingle();

  if (error || !data) {
    return { error: "Só o dono ou gestor pode alterar a conexão de WhatsApp" };
  }

  revalidatePath("/settings/integracoes");
  revalidatePath("/whatsapp");
  return null;
}
