import { z } from "zod";

export const dealSchema = z.object({
  title: z.string().trim().min(2, "Informe um título para o negócio"),
  contactId: z.uuid("Selecione um contato"),
  stageId: z.uuid("Selecione um estágio"),
  value: z.coerce.number().min(0, "O valor não pode ser negativo").default(0),
});

export type DealInput = z.infer<typeof dealSchema>;

export const updateDealStageSchema = z.object({
  dealId: z.uuid(),
  stageId: z.uuid(),
  position: z.number().int().min(0),
});

export type UpdateDealStageInput = z.infer<typeof updateDealStageSchema>;

export const updateDealOwnerSchema = z.object({
  dealId: z.uuid(),
  ownerId: z.uuid(),
});

export type UpdateDealOwnerInput = z.infer<typeof updateDealOwnerSchema>;
