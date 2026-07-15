import type { Database } from "./database.types";

export type Tenant = Database["public"]["Tables"]["tenants"]["Row"];
export type DevUser = Database["public"]["Tables"]["dev_users"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type ContactAttachment = Database["public"]["Tables"]["contact_attachments"]["Row"];
export type PipelineStage = Database["public"]["Tables"]["pipeline_stages"]["Row"];
export type Deal = Database["public"]["Tables"]["deals"]["Row"];
export type WhatsAppMessage = Database["public"]["Tables"]["whatsapp_messages"]["Row"];
export type WhatsAppConnection = Database["public"]["Tables"]["whatsapp_connections"]["Row"];
export type BlingConnection = Database["public"]["Tables"]["bling_connections"]["Row"];
export type Activity = Database["public"]["Tables"]["activities"]["Row"];

export type ContactWithCompany = Contact & {
  company: Pick<Company, "id" | "name"> | null;
};

export type DealWithContact = Deal & {
  contact: Pick<Contact, "id" | "name" | "phone"> | null;
};

export type ActivityWithProfile = Activity & {
  profile: Pick<Profile, "id" | "full_name"> | null;
};
