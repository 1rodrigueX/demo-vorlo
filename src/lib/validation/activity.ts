import { z } from "zod";

export const activitySchema = z.object({
  contactId: z.uuid(),
  type: z.enum(["note", "call", "follow_up"]),
  body: z.string().trim().min(1, "Escreva algo antes de salvar"),
});

export type ActivityInput = z.infer<typeof activitySchema>;
