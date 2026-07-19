import { z } from "zod";

export const discordConfigSchema = z.object({
  botToken: z.string().trim().min(1, "Cole o token do bot"),
  publicKey: z.string().trim().min(1, "Cole a public key"),
  applicationId: z.string().trim().optional().or(z.literal("")),
  logChannelId: z.string().trim().min(1, "Cole o ID do canal"),
});

export type DiscordConfigInput = z.infer<typeof discordConfigSchema>;
