export type ParsedEmail = {
  externalId: string;
  threadId: string | null;
  from: string;
  to: string;
  subject: string;
  /** Texto puro — usado como preview e fallback quando não há HTML. */
  body: string;
  /** HTML bruto (ainda não sanitizado) do provedor, quando disponível. */
  bodyHtml: string | null;
  date: string;
};

export type EmailAttachmentInput = {
  filename: string;
  contentType: string;
  content: Buffer;
};
