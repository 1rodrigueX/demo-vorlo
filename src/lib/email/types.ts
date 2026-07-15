export type ParsedEmail = {
  externalId: string;
  threadId: string | null;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
};

export type EmailAttachmentInput = {
  filename: string;
  contentType: string;
  content: Buffer;
};
