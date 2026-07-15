import { z } from "zod";

export const emailSendSchema = z.object({
  contactId: z.uuid(),
  subject: z.string().trim().min(1, "Escreva um assunto"),
  message: z.string().trim().min(1, "Escreva uma mensagem"),
  provider: z.enum(["gmail", "outlook"]).optional(),
});

export type EmailSendInput = z.infer<typeof emailSendSchema>;
