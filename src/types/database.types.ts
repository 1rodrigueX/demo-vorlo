// Tipagem manual do schema em supabase/migrations/*.sql.
// Se preferir gerar automaticamente depois de linkar o projeto:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          status: "active" | "suspended";
          seller_limit: number;
          manager_limit: number;
          brand_color: string;
          brand_font: string;
          assistant_button_position: "bottom-left" | "bottom-right";
          billing_plan_id: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          status?: "active" | "suspended";
          seller_limit?: number;
          manager_limit?: number;
          brand_color?: string;
          brand_font?: string;
          assistant_button_position?: "bottom-left" | "bottom-right";
          billing_plan_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          status?: "active" | "suspended";
          seller_limit?: number;
          manager_limit?: number;
          brand_color?: string;
          brand_font?: string;
          assistant_button_position?: "bottom-left" | "bottom-right";
          billing_plan_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenants_billing_plan_id_fkey";
            columns: ["billing_plan_id"];
            isOneToOne: false;
            referencedRelation: "billing_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_connections: {
        Row: {
          tenant_id: string;
          provider: "baileys" | "twilio";
          twilio_account_sid: string | null;
          twilio_auth_token: string | null;
          twilio_whatsapp_number: string | null;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          provider?: "baileys" | "twilio";
          twilio_account_sid?: string | null;
          twilio_auth_token?: string | null;
          twilio_whatsapp_number?: string | null;
          updated_at?: string;
        };
        Update: {
          tenant_id?: string;
          provider?: "baileys" | "twilio";
          twilio_account_sid?: string | null;
          twilio_auth_token?: string | null;
          twilio_whatsapp_number?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: true;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      bling_connections: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          is_default: boolean;
          tag_id: string | null;
          client_id: string | null;
          client_secret: string | null;
          access_token: string | null;
          refresh_token: string | null;
          expires_at: string | null;
          connected_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name?: string;
          is_default?: boolean;
          tag_id?: string | null;
          client_id?: string | null;
          client_secret?: string | null;
          access_token?: string | null;
          refresh_token?: string | null;
          expires_at?: string | null;
          connected_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          is_default?: boolean;
          tag_id?: string | null;
          client_id?: string | null;
          client_secret?: string | null;
          access_token?: string | null;
          refresh_token?: string | null;
          expires_at?: string | null;
          connected_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bling_connections_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bling_connections_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          color?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tags_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_tags: {
        Row: {
          contact_id: string;
          tag_id: string;
          tenant_id: string;
          created_at: string;
        };
        Insert: {
          contact_id: string;
          tag_id: string;
          tenant_id: string;
          created_at?: string;
        };
        Update: {
          contact_id?: string;
          tag_id?: string;
          tenant_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_tags_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      bling_connection_sellers: {
        Row: {
          bling_connection_id: string;
          profile_id: string;
          bling_vendedor_id: string;
          bling_vendedor_name: string | null;
          created_at: string;
        };
        Insert: {
          bling_connection_id: string;
          profile_id: string;
          bling_vendedor_id: string;
          bling_vendedor_name?: string | null;
          created_at?: string;
        };
        Update: {
          bling_connection_id?: string;
          profile_id?: string;
          bling_vendedor_id?: string;
          bling_vendedor_name?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bling_connection_sellers_bling_connection_id_fkey";
            columns: ["bling_connection_id"];
            isOneToOne: false;
            referencedRelation: "bling_connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bling_connection_sellers_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tenant_api_keys: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          created_by: string | null;
          last_used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          created_by?: string | null;
          last_used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          key_prefix?: string;
          key_hash?: string;
          created_by?: string | null;
          last_used_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_api_keys_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      dev_active_view: {
        Row: {
          dev_id: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          dev_id: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          dev_id?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dev_active_view_dev_id_fkey";
            columns: ["dev_id"];
            isOneToOne: true;
            referencedRelation: "dev_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dev_active_view_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      dev_users: {
        Row: {
          id: string;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          tenant_id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: "owner" | "manager" | "member";
          seller_tag_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          tenant_id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "owner" | "manager" | "member";
          seller_tag_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "owner" | "manager" | "member";
          seller_tag_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          website: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          website?: string | null;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          website?: string | null;
          notes?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "companies_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      contacts: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          lead_source: string | null;
          company_id: string | null;
          created_by: string;
          bling_contact_id: string | null;
          cpf_cnpj: string | null;
          address_zip: string | null;
          address_street: string | null;
          address_number: string | null;
          address_complement: string | null;
          address_neighborhood: string | null;
          address_city: string | null;
          address_state: string | null;
          needs_registration: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          lead_source?: string | null;
          company_id?: string | null;
          created_by: string;
          bling_contact_id?: string | null;
          cpf_cnpj?: string | null;
          address_zip?: string | null;
          address_street?: string | null;
          address_number?: string | null;
          address_complement?: string | null;
          address_neighborhood?: string | null;
          address_city?: string | null;
          address_state?: string | null;
          needs_registration?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          lead_source?: string | null;
          company_id?: string | null;
          created_by?: string;
          bling_contact_id?: string | null;
          cpf_cnpj?: string | null;
          address_zip?: string | null;
          address_street?: string | null;
          address_number?: string | null;
          address_complement?: string | null;
          address_neighborhood?: string | null;
          address_city?: string | null;
          address_state?: string | null;
          needs_registration?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contacts_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_attachments: {
        Row: {
          id: string;
          tenant_id: string;
          contact_id: string;
          file_name: string;
          storage_path: string;
          size_bytes: number | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          contact_id: string;
          file_name: string;
          storage_path: string;
          size_bytes?: number | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          contact_id?: string;
          file_name?: string;
          storage_path?: string;
          size_bytes?: number | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contact_attachments_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_attachments_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pipeline_stages: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          position: number;
          color: string;
          is_won: boolean;
          is_lost: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          position: number;
          color?: string;
          is_won?: boolean;
          is_lost?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          position?: number;
          color?: string;
          is_won?: boolean;
          is_lost?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      deals: {
        Row: {
          id: string;
          tenant_id: string;
          title: string;
          contact_id: string;
          stage_id: string;
          value: number;
          status: "open" | "won" | "lost";
          owner_id: string;
          position: number;
          closed_at: string | null;
          proposal_sent_at: string | null;
          bling_order_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          title: string;
          contact_id: string;
          stage_id: string;
          value?: number;
          status?: "open" | "won" | "lost";
          owner_id: string;
          position?: number;
          closed_at?: string | null;
          proposal_sent_at?: string | null;
          bling_order_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          title?: string;
          contact_id?: string;
          stage_id?: string;
          value?: number;
          status?: "open" | "won" | "lost";
          owner_id?: string;
          position?: number;
          closed_at?: string | null;
          proposal_sent_at?: string | null;
          bling_order_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_stages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deals_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_messages: {
        Row: {
          id: string;
          tenant_id: string;
          contact_id: string;
          twilio_sid: string | null;
          direction: "outbound" | "inbound";
          from_number: string;
          to_number: string;
          body: string | null;
          status: "queued" | "sending" | "sent" | "delivered" | "undelivered" | "read" | "failed" | "received";
          error_message: string | null;
          raw_payload: Json | null;
          sent_by: string | null;
          media_storage_path: string | null;
          media_content_type: string | null;
          media_file_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          contact_id: string;
          twilio_sid?: string | null;
          direction: "outbound" | "inbound";
          from_number: string;
          to_number: string;
          body?: string | null;
          status?: "queued" | "sending" | "sent" | "delivered" | "undelivered" | "read" | "failed" | "received";
          error_message?: string | null;
          raw_payload?: Json | null;
          sent_by?: string | null;
          media_storage_path?: string | null;
          media_content_type?: string | null;
          media_file_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          contact_id?: string;
          twilio_sid?: string | null;
          direction?: "outbound" | "inbound";
          from_number?: string;
          to_number?: string;
          body?: string | null;
          status?: "queued" | "sending" | "sent" | "delivered" | "undelivered" | "read" | "failed" | "received";
          error_message?: string | null;
          raw_payload?: Json | null;
          sent_by?: string | null;
          media_storage_path?: string | null;
          media_content_type?: string | null;
          media_file_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_messages_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      activities: {
        Row: {
          id: string;
          tenant_id: string;
          contact_id: string;
          deal_id: string | null;
          type: "note" | "call" | "whatsapp" | "email" | "follow_up" | "stage_change";
          body: string | null;
          direction: "outbound" | "inbound" | null;
          created_by: string | null;
          whatsapp_message_id: string | null;
          email_message_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          contact_id: string;
          deal_id?: string | null;
          type: "note" | "call" | "whatsapp" | "email" | "follow_up" | "stage_change";
          body?: string | null;
          direction?: "outbound" | "inbound" | null;
          created_by?: string | null;
          whatsapp_message_id?: string | null;
          email_message_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          contact_id?: string;
          deal_id?: string | null;
          type?: "note" | "call" | "whatsapp" | "email" | "follow_up" | "stage_change";
          body?: string | null;
          direction?: "outbound" | "inbound" | null;
          created_by?: string | null;
          whatsapp_message_id?: string | null;
          email_message_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_whatsapp_message_id_fkey";
            columns: ["whatsapp_message_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_email_message_id_fkey";
            columns: ["email_message_id"];
            isOneToOne: false;
            referencedRelation: "email_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      email_messages: {
        Row: {
          id: string;
          tenant_id: string;
          contact_id: string;
          provider: "gmail" | "outlook";
          external_message_id: string;
          thread_id: string | null;
          direction: "outbound" | "inbound";
          from_address: string;
          to_address: string;
          cc_address: string | null;
          subject: string | null;
          body: string | null;
          body_html: string | null;
          status: "sent" | "failed" | "received";
          error_message: string | null;
          raw_payload: Json | null;
          sent_by: string | null;
          attachments: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          contact_id: string;
          provider: "gmail" | "outlook";
          external_message_id: string;
          thread_id?: string | null;
          direction: "outbound" | "inbound";
          from_address: string;
          to_address: string;
          cc_address?: string | null;
          subject?: string | null;
          body?: string | null;
          body_html?: string | null;
          status?: "sent" | "failed" | "received";
          error_message?: string | null;
          raw_payload?: Json | null;
          sent_by?: string | null;
          attachments?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          contact_id?: string;
          provider?: "gmail" | "outlook";
          external_message_id?: string;
          thread_id?: string | null;
          direction?: "outbound" | "inbound";
          from_address?: string;
          to_address?: string;
          cc_address?: string | null;
          subject?: string | null;
          body?: string | null;
          body_html?: string | null;
          status?: "sent" | "failed" | "received";
          error_message?: string | null;
          raw_payload?: Json | null;
          sent_by?: string | null;
          attachments?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_messages_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_messages_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenant_integrations: {
        Row: {
          id: string;
          tenant_id: string;
          provider: "anthropic" | "gmail" | "outlook" | "google_calendar" | "microsoft365" | "custom";
          name: string;
          status: "disconnected" | "connected" | "error";
          credentials: Json;
          access_token: string | null;
          refresh_token: string | null;
          expires_at: string | null;
          connected_at: string | null;
          last_tested_at: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          provider: "anthropic" | "gmail" | "outlook" | "google_calendar" | "microsoft365" | "custom";
          name?: string;
          status?: "disconnected" | "connected" | "error";
          credentials?: Json;
          access_token?: string | null;
          refresh_token?: string | null;
          expires_at?: string | null;
          connected_at?: string | null;
          last_tested_at?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          provider?: "anthropic" | "gmail" | "outlook" | "google_calendar" | "microsoft365" | "custom";
          name?: string;
          status?: "disconnected" | "connected" | "error";
          credentials?: Json;
          access_token?: string | null;
          refresh_token?: string | null;
          expires_at?: string | null;
          connected_at?: string | null;
          last_tested_at?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_integrations_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenant_integration_logs: {
        Row: {
          id: string;
          integration_id: string;
          tenant_id: string;
          event: string;
          detail: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          integration_id: string;
          tenant_id: string;
          event: string;
          detail?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          integration_id?: string;
          tenant_id?: string;
          event?: string;
          detail?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_integration_logs_integration_id_fkey";
            columns: ["integration_id"];
            isOneToOne: false;
            referencedRelation: "tenant_integrations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenant_integration_logs_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      billing_plans: {
        Row: {
          id: string;
          name: string;
          is_default: boolean;
          base_price_cents: number;
          included_sellers: number;
          included_managers: number;
          included_agents: number;
          price_per_extra_seller_cents: number;
          price_per_extra_manager_cents: number;
          price_per_agent_cents: number;
          price_per_integration_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_default?: boolean;
          base_price_cents: number;
          included_sellers?: number;
          included_managers?: number;
          included_agents?: number;
          price_per_extra_seller_cents?: number;
          price_per_extra_manager_cents?: number;
          price_per_agent_cents?: number;
          price_per_integration_cents?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_default?: boolean;
          base_price_cents?: number;
          included_sellers?: number;
          included_managers?: number;
          included_agents?: number;
          price_per_extra_seller_cents?: number;
          price_per_extra_manager_cents?: number;
          price_per_agent_cents?: number;
          price_per_integration_cents?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stripe_webhook_events: {
        Row: { id: string; created_at: string };
        Insert: { id: string; created_at?: string };
        Update: { id?: string; created_at?: string };
        Relationships: [];
      };
      ai_agents: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          type: "fala_ai" | "sdr" | "atendente" | "financeiro" | "cobranca" | "juridico" | "custom";
          is_fala_ai: boolean;
          objective: string;
          system_prompt: string;
          model: string;
          temperature: number;
          tools: string[];
          status: "active" | "inactive";
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          type: "fala_ai" | "sdr" | "atendente" | "financeiro" | "cobranca" | "juridico" | "custom";
          is_fala_ai?: boolean;
          objective?: string;
          system_prompt: string;
          model?: string;
          temperature?: number;
          tools?: string[];
          status?: "active" | "inactive";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          type?: "fala_ai" | "sdr" | "atendente" | "financeiro" | "cobranca" | "juridico" | "custom";
          is_fala_ai?: boolean;
          objective?: string;
          system_prompt?: string;
          model?: string;
          temperature?: number;
          tools?: string[];
          status?: "active" | "inactive";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_agents_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_agent_messages: {
        Row: {
          id: string;
          tenant_id: string;
          agent_id: string;
          user_id: string;
          role: "user" | "assistant";
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          agent_id: string;
          user_id: string;
          role: "user" | "assistant";
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          agent_id?: string;
          user_id?: string;
          role?: "user" | "assistant";
          content?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_agent_messages_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "ai_agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_agent_messages_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_agent_memory: {
        Row: {
          id: string;
          tenant_id: string;
          agent_id: string;
          label: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          agent_id: string;
          label: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          agent_id?: string;
          label?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_agent_memory_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "ai_agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_agent_memory_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_agent_logs: {
        Row: {
          id: string;
          tenant_id: string;
          agent_id: string;
          user_id: string | null;
          event_type: "message" | "tool_call" | "error";
          detail: Json;
          model: string | null;
          tokens_input: number;
          tokens_output: number;
          latency_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          agent_id: string;
          user_id?: string | null;
          event_type: "message" | "tool_call" | "error";
          detail?: Json;
          model?: string | null;
          tokens_input?: number;
          tokens_output?: number;
          latency_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          agent_id?: string;
          user_id?: string | null;
          event_type?: "message" | "tool_call" | "error";
          detail?: Json;
          model?: string | null;
          tokens_input?: number;
          tokens_output?: number;
          latency_ms?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_agent_logs_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "ai_agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_agent_logs_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          role: "user" | "assistant";
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          role: "user" | "assistant";
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          role?: "user" | "assistant";
          content?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
