import type { Database } from "./database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type PipelineStage = Database["public"]["Tables"]["pipeline_stages"]["Row"];
export type Deal = Database["public"]["Tables"]["deals"]["Row"];
export type WhatsAppMessage = Database["public"]["Tables"]["whatsapp_messages"]["Row"];
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
