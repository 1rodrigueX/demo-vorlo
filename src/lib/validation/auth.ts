import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Informe um email válido"),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;
