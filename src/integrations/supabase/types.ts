export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      auth_rate_limits: {
        Row: {
          rate_key: string
          request_count: number
          updated_at: string
          window_started_at: string
        }
        Insert: {
          rate_key: string
          request_count?: number
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          rate_key?: string
          request_count?: number
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["record_status"]
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["record_status"]
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["record_status"]
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_branding: {
        Row: {
          accent_color: string | null
          brand_name: string | null
          company_id: string
          contact_email: string | null
          created_at: string
          favicon_url: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          show_vellune_branding: boolean
          updated_at: string
          website_url: string | null
          whatsapp_number: string | null
        }
        Insert: {
          accent_color?: string | null
          brand_name?: string | null
          company_id: string
          contact_email?: string | null
          created_at?: string
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_vellune_branding?: boolean
          updated_at?: string
          website_url?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          accent_color?: string | null
          brand_name?: string | null
          company_id?: string
          contact_email?: string | null
          created_at?: string
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_vellune_branding?: boolean
          updated_at?: string
          website_url?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_branding_company_fk"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_domains: {
        Row: {
          company_id: string
          created_at: string
          domain: string
          domain_type: string
          id: string
          is_primary: boolean
          notes: string | null
          status: string
          updated_at: string
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          domain: string
          domain_type?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          status?: string
          updated_at?: string
          verification_token?: string
          verified_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          domain?: string
          domain_type?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          status?: string
          updated_at?: string
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_domains_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_subscriptions: {
        Row: {
          activated_at: string | null
          cancelled_at: string | null
          changed_by: string | null
          company_id: string
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          plan_id: string
          starts_at: string
          status: string
          suspended_at: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          cancelled_at?: string | null
          changed_by?: string | null
          company_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          plan_id: string
          starts_at?: string
          status?: string
          suspended_at?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          cancelled_at?: string | null
          changed_by?: string | null
          company_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          plan_id?: string
          starts_at?: string
          status?: string
          suspended_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_changed_by_fk"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_company_fk"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_plan_fk"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          company_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          id: string
          name: string
          observation: string | null
          phone: string | null
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          name: string
          observation?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          name?: string
          observation?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          company_id: string | null
          created_at: string
          file_name: string
          id: string
          invitation_id: string | null
          mime_type: string
          size: number
          storage_path: string
          template_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          file_name: string
          id?: string
          invitation_id?: string | null
          mime_type: string
          size: number
          storage_path: string
          template_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          file_name?: string
          id?: string
          invitation_id?: string | null
          mime_type?: string
          size?: number
          storage_path?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_checkins: {
        Row: {
          checked_in_at: string
          company_id: string
          created_at: string
          guest_id: string
          id: string
          invitation_id: string
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          checked_in_at?: string
          company_id: string
          created_at?: string
          guest_id: string
          id?: string
          invitation_id: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          checked_in_at?: string
          company_id?: string
          created_at?: string
          guest_id?: string
          id?: string
          invitation_id?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_checkins_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_checkins_guest_fk"
            columns: ["invitation_id", "guest_id", "company_id"]
            isOneToOne: false
            referencedRelation: "invitation_guests"
            referencedColumns: ["invitation_id", "guest_id", "company_id"]
          },
          {
            foreignKeyName: "guest_checkins_invitation_fk"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_guests: {
        Row: {
          company_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          guest_id: string
          id: string
          invitation_id: string
          name: string
          people_count: number
          phone: string | null
          qr_token: string
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          guest_id?: string
          id?: string
          invitation_id: string
          name: string
          people_count?: number
          phone?: string | null
          qr_token?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          guest_id?: string
          id?: string
          invitation_id?: string
          name?: string
          people_count?: number
          phone?: string | null
          qr_token?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_guests_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_guests_deleted_by_fk"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_guests_invitation_fk"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_views: {
        Row: {
          created_at: string
          id: string
          invitation_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitation_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invitation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_views_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          access_token: string | null
          address: string | null
          city: string | null
          company_id: string
          content: Json
          created_at: string
          customer_id: string
          deleted_at: string | null
          deleted_by: string | null
          event_date: string
          event_time: string
          id: string
          message: string | null
          name: string
          published_at: string | null
          slug: string
          state: string | null
          status: Database["public"]["Enums"]["invitation_status"]
          template_id: string | null
          updated_at: string
          venue_name: string | null
        }
        Insert: {
          access_token?: string | null
          address?: string | null
          city?: string | null
          company_id: string
          content?: Json
          created_at?: string
          customer_id: string
          deleted_at?: string | null
          deleted_by?: string | null
          event_date: string
          event_time: string
          id?: string
          message?: string | null
          name: string
          published_at?: string | null
          slug: string
          state?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          template_id?: string | null
          updated_at?: string
          venue_name?: string | null
        }
        Update: {
          access_token?: string | null
          address?: string | null
          city?: string | null
          company_id?: string
          content?: Json
          created_at?: string
          customer_id?: string
          deleted_at?: string | null
          deleted_by?: string | null
          event_date?: string
          event_time?: string
          id?: string
          message?: string | null
          name?: string
          published_at?: string | null
          slug?: string
          state?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          template_id?: string | null
          updated_at?: string
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_favorites: {
        Row: {
          created_at: string
          id: string
          invitation_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitation_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invitation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_favorites_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      template_favorites: {
        Row: {
          created_at: string
          id: string
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_favorites_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_read_markers: {
        Row: {
          created_at: string
          group_id: string
          group_type: string
          id: string
          last_read_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          group_type: string
          id?: string
          last_read_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          group_type?: string
          id?: string
          last_read_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_read_markers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvp_configs: {
        Row: {
          allow_email: boolean
          allow_phone: boolean
          created_at: string
          deadline: string | null
          enabled: boolean
          id: string
          invitation_id: string
          max_people: number | null
          updated_at: string
        }
        Insert: {
          allow_email?: boolean
          allow_phone?: boolean
          created_at?: string
          deadline?: string | null
          enabled?: boolean
          id?: string
          invitation_id: string
          max_people?: number | null
          updated_at?: string
        }
        Update: {
          allow_email?: boolean
          allow_phone?: boolean
          created_at?: string
          deadline?: string | null
          enabled?: boolean
          id?: string
          invitation_id?: string
          max_people?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_configs_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: true
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvp_responses: {
        Row: {
          created_at: string
          email: string | null
          guest_id: string | null
          id: string
          invitation_id: string
          name: string
          people_count: number
          phone: string | null
          status: Database["public"]["Enums"]["rsvp_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          guest_id?: string | null
          id?: string
          invitation_id: string
          name: string
          people_count?: number
          phone?: string | null
          status: Database["public"]["Enums"]["rsvp_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          guest_id?: string | null
          id?: string
          invitation_id?: string
          name?: string
          people_count?: number
          phone?: string | null
          status?: Database["public"]["Enums"]["rsvp_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_responses_invitation_guest_fk"
            columns: ["invitation_id", "guest_id"]
            isOneToOne: false
            referencedRelation: "invitation_guests"
            referencedColumns: ["invitation_id", "guest_id"]
          },
          {
            foreignKeyName: "rsvp_responses_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          code: string
          created_at: string
          customers_limit: number | null
          description: string | null
          duration_days: number
          features: Json
          guests_limit: number | null
          id: string
          invitations_limit: number | null
          name: string
          premium_templates_limit: number | null
          price_monthly: number
          status: Database["public"]["Enums"]["record_status"]
          storage_limit_mb: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          customers_limit?: number | null
          description?: string | null
          duration_days?: number
          features?: Json
          guests_limit?: number | null
          id?: string
          invitations_limit?: number | null
          name: string
          premium_templates_limit?: number | null
          price_monthly?: number
          status?: Database["public"]["Enums"]["record_status"]
          storage_limit_mb?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          customers_limit?: number | null
          description?: string | null
          duration_days?: number
          features?: Json
          guests_limit?: number | null
          id?: string
          invitations_limit?: number | null
          name?: string
          premium_templates_limit?: number | null
          price_monthly?: number
          status?: Database["public"]["Enums"]["record_status"]
          storage_limit_mb?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          category: Database["public"]["Enums"]["template_category"]
          company_id: string | null
          content: Json
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          name: string
          preview_image: string | null
          status: Database["public"]["Enums"]["record_status"]
          type: Database["public"]["Enums"]["template_type"]
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["template_category"]
          company_id?: string | null
          content?: Json
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name: string
          preview_image?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          type: Database["public"]["Enums"]["template_type"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["template_category"]
          company_id?: string | null
          content?: Json
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name?: string
          preview_image?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          type?: Database["public"]["Enums"]["template_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          company_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          email: string
          id: string
          last_login_at: string | null
          last_seen_at: string | null
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["record_status"]
          theme: Database["public"]["Enums"]["ui_theme"] | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          company_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email: string
          id?: string
          last_login_at?: string | null
          last_seen_at?: string | null
          name: string
          phone?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["record_status"]
          theme?: Database["public"]["Enums"]["ui_theme"] | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          company_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string
          id?: string
          last_login_at?: string | null
          last_seen_at?: string | null
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["record_status"]
          theme?: Database["public"]["Enums"]["ui_theme"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_auth_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      current_company_id: { Args: never; Returns: string }
      get_public_invitation: { Args: { _slug: string }; Returns: Json }
      invitation_company: { Args: { _invitation_id: string }; Returns: string }
      invitation_report: {
        Args: { _company_id?: string }
        Returns: {
          company_id: string
          confirmed: number
          customer_name: string
          declined: number
          event_date: string
          event_time: string
          id: string
          name: string
          people: number
          status: Database["public"]["Enums"]["invitation_status"]
          updated_at: string
          views: number
        }[]
      }
      is_super_admin: { Args: never; Returns: boolean }
      record_invitation_view: { Args: { _slug: string }; Returns: boolean }
      rsvp_public_state: {
        Args: { _inv: Database["public"]["Tables"]["invitations"]["Row"] }
        Returns: Json
      }
      submit_rsvp: {
        Args: {
          _email: string
          _name: string
          _people: number
          _phone: string
          _slug: string
          _status: string
          _update: boolean
        }
        Returns: Json
      }
      use_official_template: { Args: { _template_id: string }; Returns: string }
    }
    Enums: {
      app_role: "super_admin" | "company_admin"
      invitation_status: "draft" | "published" | "closed" | "deleted"
      record_status: "active" | "inactive"
      rsvp_status: "confirmed" | "declined"
      template_category:
        | "casamento"
        | "aniversario"
        | "cha_de_bebe"
        | "cha_revelacao"
        | "15_anos"
        | "formatura"
        | "festa_infantil"
        | "outros"
      template_type: "official" | "company"
      ui_theme: "light" | "dark"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "company_admin"],
      invitation_status: ["draft", "published", "closed", "deleted"],
      record_status: ["active", "inactive"],
      rsvp_status: ["confirmed", "declined"],
      template_category: [
        "casamento",
        "aniversario",
        "cha_de_bebe",
        "cha_revelacao",
        "15_anos",
        "formatura",
        "festa_infantil",
        "outros",
      ],
      template_type: ["official", "company"],
      ui_theme: ["light", "dark"],
    },
  },
} as const
