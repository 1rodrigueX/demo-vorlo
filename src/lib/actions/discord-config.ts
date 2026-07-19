"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserDev } from "@/lib/auth/current-user";
import { discordConfigSchema } from "@/lib/validation/discord-config";
import { getDiscordConfig } from "@/lib/discord/config";
import { sendDiscordMessage } from "@/lib/discord/send";

export type ActionState = { error?: string } | null;

export async function getDiscordConfigForForm() {
  if (!(await isCurrentUserDev())) return null;
  return getDiscordConfig();
}

async function persistDiscordConfig(formData: FormData): Promise<ActionState> {
  const parsed = discordConfigSchema.safeParse({
    botToken: formData.get("botToken"),
    publicKey: formData.get("publicKey"),
    applicationId: formData.get("applicationId"),
    logChannelId: formData.get("logChannelId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("platform_discord_config").upsert(
    {
      id: true,
      bot_token: parsed.data.botToken,
      public_key: parsed.data.publicKey,
      application_id: parsed.data.applicationId || null,
      log_channel_id: parsed.data.logChannelId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) return { error: `Não foi possível salvar: ${error.message}` };
  return null;
}

export async function saveDiscordConfig(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isCurrentUserDev())) {
    return { error: "Acesso restrito a devs da plataforma" };
  }

  const result = await persistDiscordConfig(formData);
  if (result?.error) return result;

  revalidatePath("/dev/discord");
  return null;
}

/** Salva e já testa com os valores que acabaram de ser digitados no formulário, não com o que já estava salvo antes. */
export async function saveAndTestDiscordConfig(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isCurrentUserDev())) {
    return { error: "Acesso restrito a devs da plataforma" };
  }

  const saveResult = await persistDiscordConfig(formData);
  if (saveResult?.error) return saveResult;
  revalidatePath("/dev/discord");

  const testResult = await sendDiscordMessage({
    title: "✅ Teste de conexão",
    description: "Se você está vendo isso, o bot está configurado certinho.",
    color: 0x6366f1,
  });

  if (!testResult.ok) return { error: `Salvo, mas o teste falhou: ${testResult.error}` };
  return null;
}
