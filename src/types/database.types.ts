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
          status: "active" | "past_due" | "suspended";
          seller_limit: number;
          manager_limit: number;
          assistant_button_position: "bottom-left" | "bottom-right";
          logo_storage_path: string | null;
          click_sound_path: string | null;
          youtube_api_key: string | null;
          billing_plan_id: string | null;
          mp_payer_id: string | null;
          last_payment_id: string | null;
          monthly_amount_cents: number | null;
          next_billing_at: string | null;
          pending_payment_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          status?: "active" | "past_due" | "suspended";
          seller_limit?: number;
          manager_limit?: number;
          assistant_button_position?: "bottom-left" | "bottom-right";
          logo_storage_path?: string | null;
          click_sound_path?: string | null;
          youtube_api_key?: string | null;
          billing_plan_id?: string | null;
          mp_payer_id?: string | null;
          last_payment_id?: string | null;
          monthly_amount_cents?: number | null;
          next_billing_at?: string | null;
          pending_payment_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          status?: "active" | "past_due" | "suspended";
          seller_limit?: number;
          manager_limit?: number;
          assistant_button_position?: "bottom-left" | "bottom-right";
          logo_storage_path?: string | null;
          click_sound_path?: string | null;
          youtube_api_key?: string | null;
          billing_plan_id?: string | null;
          mp_payer_id?: string | null;
          last_payment_id?: string | null;
          monthly_amount_cents?: number | null;
          next_billing_at?: string | null;
          pending_payment_url?: string | null;
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
      platform_tutorial_videos: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          video_url: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          video_url: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          video_url?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      suggestions: {
        Row: {
          id: string;
          tenant_id: string;
          created_by: string | null;
          created_by_name: string | null;
          message: string;
          status: "new" | "answered";
          response: string | null;
          responded_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          created_by?: string | null;
          created_by_name?: string | null;
          message: string;
          status?: "new" | "answered";
          response?: string | null;
          responded_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          created_by?: string | null;
          created_by_name?: string | null;
          message?: string;
          status?: "new" | "answered";
          response?: string | null;
          responded_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "suggestions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_feedback: {
        Row: {
          id: string;
          user_id: string | null;
          email: string;
          message: string;
          status: "new" | "answered";
          response: string | null;
          responded_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email: string;
          message: string;
          status?: "new" | "answered";
          response?: string | null;
          responded_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          email?: string;
          message?: string;
          status?: "new" | "answered";
          response?: string | null;
          responded_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
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
      user_spotify_connections: {
        Row: {
          profile_id: string;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          spotify_user_id: string | null;
          product: string | null;
          connected_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          spotify_user_id?: string | null;
          product?: string | null;
          connected_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          access_token?: string;
          refresh_token?: string;
          expires_at?: string;
          spotify_user_id?: string | null;
          product?: string | null;
          connected_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_spotify_connections_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
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
      mercadopago_webhook_events: {
        Row: { id: string; created_at: string };
        Insert: { id: string; created_at?: string };
        Update: { id?: string; created_at?: string };
        Relationships: [];
      };
      tenant_company_profile: {
        Row: {
          tenant_id: string;
          description: string | null;
          website: string | null;
          instagram: string | null;
          website_content: string | null;
          website_fetched_at: string | null;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          description?: string | null;
          website?: string | null;
          instagram?: string | null;
          website_content?: string | null;
          website_fetched_at?: string | null;
          updated_at?: string;
        };
        Update: {
          tenant_id?: string;
          description?: string | null;
          website?: string | null;
          instagram?: string | null;
          website_content?: string | null;
          website_fetched_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_company_profile_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: true;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      company_product_photos: {
        Row: {
          id: string;
          tenant_id: string;
          storage_path: string;
          file_name: string;
          caption: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          storage_path: string;
          file_name: string;
          caption?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          storage_path?: string;
          file_name?: string;
          caption?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_product_photos_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      company_catalogs: {
        Row: {
          id: string;
          tenant_id: string;
          storage_path: string;
          file_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          storage_path: string;
          file_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          storage_path?: string;
          file_name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_catalogs_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      pending_checkouts: {
        Row: {
          id: string;
          user_id: string;
          status: "pending" | "completed";
          company_name: string;
          plan_id: string;
          extra_sellers: number;
          extra_managers: number;
          extra_agents: number;
          extra_integrations: number;
          anthropic_api_key: string | null;
          mp_preference_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: "pending" | "completed";
          company_name: string;
          plan_id: string;
          extra_sellers?: number;
          extra_managers?: number;
          extra_agents?: number;
          extra_integrations?: number;
          anthropic_api_key?: string | null;
          mp_preference_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: "pending" | "completed";
          company_name?: string;
          plan_id?: string;
          extra_sellers?: number;
          extra_managers?: number;
          extra_agents?: number;
          extra_integrations?: number;
          anthropic_api_key?: string | null;
          mp_preference_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pending_checkouts_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "billing_plans";
            referencedColumns: ["id"];
          },
        ];
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
      transportadora_plans: {
        Row: {
          id: string;
          name: string;
          is_default: boolean;
          monthly_price_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_default?: boolean;
          monthly_price_cents: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_default?: boolean;
          monthly_price_cents?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      financas_plans: {
        Row: {
          id: string;
          name: string;
          is_default: boolean;
          monthly_price_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_default?: boolean;
          monthly_price_cents: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_default?: boolean;
          monthly_price_cents?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      estoque_plans: {
        Row: {
          id: string;
          name: string;
          is_default: boolean;
          monthly_price_cents: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_default?: boolean;
          monthly_price_cents?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_default?: boolean;
          monthly_price_cents?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      producao_plans: {
        Row: {
          id: string;
          name: string;
          is_default: boolean;
          monthly_price_cents: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_default?: boolean;
          monthly_price_cents?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_default?: boolean;
          monthly_price_cents?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      producao_turnos: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          start_time: string | null;
          end_time: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          start_time?: string | null;
          end_time?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          start_time?: string | null;
          end_time?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "producao_turnos_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      producao_maquinas: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          status: "ativa" | "manutencao" | "parada";
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          status?: "ativa" | "manutencao" | "parada";
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          status?: "ativa" | "manutencao" | "parada";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "producao_maquinas_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      producao_estilos: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "producao_estilos_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      producao_produtos: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          estoque_item_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          estoque_item_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          estoque_item_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "producao_produtos_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "producao_produtos_estoque_item_id_fkey";
            columns: ["estoque_item_id"];
            isOneToOne: false;
            referencedRelation: "estoque_itens";
            referencedColumns: ["id"];
          },
        ];
      };
      producao_receita_itens: {
        Row: {
          id: string;
          tenant_id: string;
          produto_id: string;
          materia_prima_id: string;
          quantity_per_unit: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          produto_id: string;
          materia_prima_id: string;
          quantity_per_unit: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          produto_id?: string;
          materia_prima_id?: string;
          quantity_per_unit?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "producao_receita_itens_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "producao_produtos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "producao_receita_itens_materia_prima_id_fkey";
            columns: ["materia_prima_id"];
            isOneToOne: false;
            referencedRelation: "estoque_itens";
            referencedColumns: ["id"];
          },
        ];
      };
      producao_funcionarios: {
        Row: {
          id: string;
          tenant_id: string;
          full_name: string;
          turno_id: string | null;
          maquina_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          tenant_id: string;
          full_name: string;
          turno_id?: string | null;
          maquina_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          full_name?: string;
          turno_id?: string | null;
          maquina_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "producao_funcionarios_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "producao_funcionarios_turno_id_fkey";
            columns: ["turno_id"];
            isOneToOne: false;
            referencedRelation: "producao_turnos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "producao_funcionarios_maquina_id_fkey";
            columns: ["maquina_id"];
            isOneToOne: false;
            referencedRelation: "producao_maquinas";
            referencedColumns: ["id"];
          },
        ];
      };
      producao_apontamentos: {
        Row: {
          id: string;
          tenant_id: string;
          produto_id: string;
          turno_id: string | null;
          maquina_id: string | null;
          estilo_id: string | null;
          funcionario_id: string | null;
          quantity: number;
          perdas: number;
          note: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          produto_id: string;
          turno_id?: string | null;
          maquina_id?: string | null;
          estilo_id?: string | null;
          funcionario_id?: string | null;
          quantity: number;
          perdas?: number;
          note?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          produto_id?: string;
          turno_id?: string | null;
          maquina_id?: string | null;
          estilo_id?: string | null;
          funcionario_id?: string | null;
          quantity?: number;
          perdas?: number;
          note?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "producao_apontamentos_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "producao_produtos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "producao_apontamentos_turno_id_fkey";
            columns: ["turno_id"];
            isOneToOne: false;
            referencedRelation: "producao_turnos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "producao_apontamentos_maquina_id_fkey";
            columns: ["maquina_id"];
            isOneToOne: false;
            referencedRelation: "producao_maquinas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "producao_apontamentos_estilo_id_fkey";
            columns: ["estilo_id"];
            isOneToOne: false;
            referencedRelation: "producao_estilos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "producao_apontamentos_funcionario_id_fkey";
            columns: ["funcionario_id"];
            isOneToOne: false;
            referencedRelation: "producao_funcionarios";
            referencedColumns: ["id"];
          },
        ];
      };
      tenant_products: {
        Row: {
          tenant_id: string;
          product: "transportadora" | "financas" | "estoque" | "producao";
          status: "active" | "past_due" | "suspended";
          plan_id: string | null;
          mp_payer_id: string | null;
          last_payment_id: string | null;
          monthly_amount_cents: number | null;
          next_billing_at: string | null;
          pending_payment_url: string | null;
          activated_at: string;
        };
        Insert: {
          tenant_id: string;
          product: "transportadora" | "financas" | "estoque" | "producao";
          status?: "active" | "past_due" | "suspended";
          plan_id?: string | null;
          mp_payer_id?: string | null;
          last_payment_id?: string | null;
          monthly_amount_cents?: number | null;
          next_billing_at?: string | null;
          pending_payment_url?: string | null;
          activated_at?: string;
        };
        Update: {
          tenant_id?: string;
          product?: "transportadora" | "financas" | "estoque" | "producao";
          status?: "active" | "past_due" | "suspended";
          plan_id?: string | null;
          mp_payer_id?: string | null;
          last_payment_id?: string | null;
          monthly_amount_cents?: number | null;
          next_billing_at?: string | null;
          pending_payment_url?: string | null;
          activated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_products_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      transportadora_pending_checkouts: {
        Row: {
          id: string;
          user_id: string;
          status: "pending" | "completed";
          tenant_id: string | null;
          company_name: string | null;
          plan_id: string;
          mp_preference_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: "pending" | "completed";
          tenant_id?: string | null;
          company_name?: string | null;
          plan_id: string;
          mp_preference_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: "pending" | "completed";
          tenant_id?: string | null;
          company_name?: string | null;
          plan_id?: string;
          mp_preference_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transportadora_pending_checkouts_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transportadora_pending_checkouts_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "transportadora_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      transportadora_clientes: {
        Row: {
          id: string;
          tenant_id: string;
          nome: string;
          telefone: string;
          documento: string;
          endereco: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          nome: string;
          telefone?: string;
          documento?: string;
          endereco?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          nome?: string;
          telefone?: string;
          documento?: string;
          endereco?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transportadora_clientes_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      transportadora_motoristas: {
        Row: {
          id: string;
          tenant_id: string;
          nome: string;
          telefone: string;
          cnh: string;
          placa_veiculo: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          nome: string;
          telefone?: string;
          cnh?: string;
          placa_veiculo?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          nome?: string;
          telefone?: string;
          cnh?: string;
          placa_veiculo?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transportadora_motoristas_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      transportadora_fretes: {
        Row: {
          id: string;
          tenant_id: string;
          cliente_id: string;
          motorista_id: string;
          origem: string;
          destino: string;
          data: string;
          distancia_km: number;
          valor_por_km: number;
          margem_lucro_percentual: number;
          valor_frete: number;
          calcular_por_km: boolean;
          status: "cotacao" | "em_andamento" | "concluido" | "perdido";
          numero_nf: string;
          observacoes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          cliente_id: string;
          motorista_id: string;
          origem: string;
          destino: string;
          data: string;
          distancia_km?: number;
          valor_por_km?: number;
          margem_lucro_percentual?: number;
          valor_frete?: number;
          calcular_por_km?: boolean;
          status?: "cotacao" | "em_andamento" | "concluido" | "perdido";
          numero_nf?: string;
          observacoes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          cliente_id?: string;
          motorista_id?: string;
          origem?: string;
          destino?: string;
          data?: string;
          distancia_km?: number;
          valor_por_km?: number;
          margem_lucro_percentual?: number;
          valor_frete?: number;
          calcular_por_km?: boolean;
          status?: "cotacao" | "em_andamento" | "concluido" | "perdido";
          numero_nf?: string;
          observacoes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transportadora_fretes_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transportadora_fretes_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "transportadora_clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transportadora_fretes_motorista_id_fkey";
            columns: ["motorista_id"];
            isOneToOne: false;
            referencedRelation: "transportadora_motoristas";
            referencedColumns: ["id"];
          },
        ];
      };
      transportadora_configuracoes: {
        Row: {
          tenant_id: string;
          fator_imposto: number;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          fator_imposto?: number;
          updated_at?: string;
        };
        Update: {
          tenant_id?: string;
          fator_imposto?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transportadora_configuracoes_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: true;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      automation_jobs: {
        Row: {
          id: string;
          tenant_id: string;
          job_type: "lead_webhook_welcome";
          run_at: string;
          status: "pending" | "processing" | "done" | "failed";
          attempts: number;
          payload: Json;
          error: string | null;
          created_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          job_type: "lead_webhook_welcome";
          run_at?: string;
          status?: "pending" | "processing" | "done" | "failed";
          attempts?: number;
          payload?: Json;
          error?: string | null;
          created_at?: string;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          job_type?: "lead_webhook_welcome";
          run_at?: string;
          status?: "pending" | "processing" | "done" | "failed";
          attempts?: number;
          payload?: Json;
          error?: string | null;
          created_at?: string;
          processed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "automation_jobs_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_webhooks: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          token: string;
          target_stage_id: string | null;
          welcome_message: string | null;
          is_active: boolean;
          leads_received: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          token?: string;
          target_stage_id?: string | null;
          welcome_message?: string | null;
          is_active?: boolean;
          leads_received?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          token?: string;
          target_stage_id?: string | null;
          welcome_message?: string | null;
          is_active?: boolean;
          leads_received?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_webhooks_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_webhooks_target_stage_id_fkey";
            columns: ["target_stage_id"];
            isOneToOne: false;
            referencedRelation: "pipeline_stages";
            referencedColumns: ["id"];
          },
        ];
      };
      bug_reports: {
        Row: {
          id: string;
          tenant_id: string;
          created_by: string | null;
          created_by_name: string | null;
          message: string;
          severity: "baixa" | "media" | "alta" | "critica";
          status: "new" | "answered";
          response: string | null;
          responded_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          created_by?: string | null;
          created_by_name?: string | null;
          message: string;
          severity?: "baixa" | "media" | "alta" | "critica";
          status?: "new" | "answered";
          response?: string | null;
          responded_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          created_by?: string | null;
          created_by_name?: string | null;
          message?: string;
          severity?: "baixa" | "media" | "alta" | "critica";
          status?: "new" | "answered";
          response?: string | null;
          responded_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bug_reports_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_discord_config: {
        Row: {
          id: boolean;
          bot_token: string | null;
          public_key: string | null;
          application_id: string | null;
          log_channel_id: string | null;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          bot_token?: string | null;
          public_key?: string | null;
          application_id?: string | null;
          log_channel_id?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: boolean;
          bot_token?: string | null;
          public_key?: string | null;
          application_id?: string | null;
          log_channel_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      financas_lancamentos: {
        Row: {
          id: string;
          tenant_id: string;
          context: "pessoal" | "empresarial";
          type: "receita" | "despesa";
          category: string;
          description: string | null;
          amount_cents: number;
          entry_date: string;
          created_by: string | null;
          created_at: string;
          source: "manual" | "open_finance" | "crm" | "estoque";
          payment_method: "pix" | "boleto" | "cartao_credito" | "debito" | null;
          external_id: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          context: "pessoal" | "empresarial";
          type: "receita" | "despesa";
          category: string;
          description?: string | null;
          amount_cents: number;
          entry_date: string;
          created_by?: string | null;
          created_at?: string;
          source?: "manual" | "open_finance" | "crm" | "estoque";
          payment_method?: "pix" | "boleto" | "cartao_credito" | "debito" | null;
          external_id?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          context?: "pessoal" | "empresarial";
          type?: "receita" | "despesa";
          category?: string;
          description?: string | null;
          amount_cents?: number;
          entry_date?: string;
          created_by?: string | null;
          created_at?: string;
          source?: "manual" | "open_finance" | "crm" | "estoque";
          payment_method?: "pix" | "boleto" | "cartao_credito" | "debito" | null;
          external_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "financas_lancamentos_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      financas_bank_connections: {
        Row: {
          id: string;
          tenant_id: string;
          provider: "mock";
          institution_name: string;
          status: "disconnected" | "connected";
          last_synced_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          provider?: "mock";
          institution_name?: string;
          status?: "disconnected" | "connected";
          last_synced_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          provider?: "mock";
          institution_name?: string;
          status?: "disconnected" | "connected";
          last_synced_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "financas_bank_connections_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: true;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      financas_inbox: {
        Row: {
          id: string;
          tenant_id: string;
          source: "crm_deal";
          reference_id: string | null;
          type: "receita" | "despesa";
          category: string;
          description: string | null;
          amount_cents: number;
          entry_date: string;
          status: "pending" | "approved" | "dismissed";
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          source: "crm_deal";
          reference_id?: string | null;
          type: "receita" | "despesa";
          category: string;
          description?: string | null;
          amount_cents: number;
          entry_date: string;
          status?: "pending" | "approved" | "dismissed";
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          source?: "crm_deal";
          reference_id?: string | null;
          type?: "receita" | "despesa";
          category?: string;
          description?: string | null;
          amount_cents?: number;
          entry_date?: string;
          status?: "pending" | "approved" | "dismissed";
          created_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "financas_inbox_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      estoque_itens: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          unit: string;
          quantity: number;
          unit_cost_cents: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          unit?: string;
          quantity?: number;
          unit_cost_cents?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          unit?: string;
          quantity?: number;
          unit_cost_cents?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "estoque_itens_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      estoque_movimentacoes: {
        Row: {
          id: string;
          tenant_id: string;
          item_id: string;
          type: "entrada" | "saida";
          quantity: number;
          unit_cost_cents: number;
          total_cents: number;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          item_id: string;
          type: "entrada" | "saida";
          quantity: number;
          unit_cost_cents?: number;
          total_cents?: number;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          item_id?: string;
          type?: "entrada" | "saida";
          quantity?: number;
          unit_cost_cents?: number;
          total_cents?: number;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "estoque_movimentacoes_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "estoque_movimentacoes_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "estoque_itens";
            referencedColumns: ["id"];
          },
        ];
      };
      financas_categorias: {
        Row: {
          id: string;
          tenant_id: string;
          type: "receita" | "despesa";
          name: string;
          color: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          type: "receita" | "despesa";
          name: string;
          color: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          type?: "receita" | "despesa";
          name?: string;
          color?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "financas_categorias_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      registrar_apontamento: {
        Args: {
          p_produto_id: string;
          p_turno_id: string | null;
          p_maquina_id: string | null;
          p_estilo_id: string | null;
          p_quantity: number;
          p_note: string | null;
          p_perdas?: number;
        };
        Returns: string;
      };
      current_tenant_has_transportadora: { Args: Record<string, never>; Returns: boolean };
      current_tenant_has_financas: { Args: Record<string, never>; Returns: boolean };
      current_tenant_has_estoque: { Args: Record<string, never>; Returns: boolean };
      current_tenant_has_producao: { Args: Record<string, never>; Returns: boolean };
      current_tenant_has_producao_actor: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
