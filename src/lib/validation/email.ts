import { z } from "zod";

export const emailSendSchema = z
  .object({
    contactId: z.uuid().optional(),
    to: z.string().trim().toLowerCase().email("E-mail do destinatário inválido").optional(),
    cc: z.string().trim().optional(),
    subject: z.string().trim().min(1, "Escreva um assunto"),
    message: z.string().trim().min(1, "Escreva uma mensagem"),
    provider: z.enum(["gmail", "outlook"]).optional(),
  })
  .refine((data) => data.contactId || data.to, {
    message: "Informe o destinatário",
    path: ["to"],
  });

export type EmailSendInput = z.infer<typeof emailSendSchema>;

/** Divide "fulano@ex.com, ciclano@ex.com" (ou com ;) numa lista de e-mails válidos; lança se algum for inválido. */
export function parseCcAddresses(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  const addresses = raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalid = addresses.find((addr) => !emailPattern.test(addr));
  if (invalid) throw new Error(`E-mail em cópia inválido: ${invalid}`);

  return addresses;
}
