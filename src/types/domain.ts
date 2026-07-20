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
export type Tag = Database["public"]["Tables"]["tags"]["Row"];
export type ContactTag = Database["public"]["Tables"]["contact_tags"]["Row"];
export type Activity = Database["public"]["Tables"]["activities"]["Row"];
export type EmailMessage = Database["public"]["Tables"]["email_messages"]["Row"];
export type TenantIntegration = Database["public"]["Tables"]["tenant_integrations"]["Row"];
export type TenantIntegrationLog = Database["public"]["Tables"]["tenant_integration_logs"]["Row"];
export type AiAgent = Database["public"]["Tables"]["ai_agents"]["Row"];
export type AiAgentMessage = Database["public"]["Tables"]["ai_agent_messages"]["Row"];
export type AiAgentMemory = Database["public"]["Tables"]["ai_agent_memory"]["Row"];
export type AiAgentLog = Database["public"]["Tables"]["ai_agent_logs"]["Row"];
export type AgentType = AiAgent["type"];
export type BillingPlan = Database["public"]["Tables"]["billing_plans"]["Row"];
export type PendingCheckout = Database["public"]["Tables"]["pending_checkouts"]["Row"];
export type TenantCompanyProfile = Database["public"]["Tables"]["tenant_company_profile"]["Row"];
export type CompanyProductPhoto = Database["public"]["Tables"]["company_product_photos"]["Row"];
export type CompanyCatalog = Database["public"]["Tables"]["company_catalogs"]["Row"];
export type BlingConnectionSeller = Database["public"]["Tables"]["bling_connection_sellers"]["Row"];
export type TenantApiKey = Database["public"]["Tables"]["tenant_api_keys"]["Row"];
export type PlatformTutorialVideo = Database["public"]["Tables"]["platform_tutorial_videos"]["Row"];
export type UserSpotifyConnection = Database["public"]["Tables"]["user_spotify_connections"]["Row"];
export type Suggestion = Database["public"]["Tables"]["suggestions"]["Row"];
export type PlatformFeedback = Database["public"]["Tables"]["platform_feedback"]["Row"];
export type BugReport = Database["public"]["Tables"]["bug_reports"]["Row"];
export type FinancasLancamento = Database["public"]["Tables"]["financas_lancamentos"]["Row"];
export type FinancasCategoria = Database["public"]["Tables"]["financas_categorias"]["Row"];

export type ContactWithCompany = Contact & {
  company: Pick<Company, "id" | "name"> | null;
};

export type DealWithContact = Deal & {
  contact: Pick<Contact, "id" | "name" | "phone"> | null;
};

export type ActivityWithProfile = Activity & {
  profile: Pick<Profile, "id" | "full_name"> | null;
};
