import { z } from "zod";

export const updateWhatsAppConnectionSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("baileys"),
  }),
  z.object({
    provider: z.literal("twilio"),
    twilioAccountSid: z.string().trim().min(1, "Informe o Account SID"),
    twilioAuthToken: z.string().trim().min(1, "Informe o Auth Token"),
    twilioWhatsappNumber: z
      .string()
      .trim()
      .regex(/^whatsapp:\+\d+$/, "Use o formato whatsapp:+55..."),
  }),
]);

export type UpdateWhatsAppConnectionInput = z.infer<typeof updateWhatsAppConnectionSchema>;
