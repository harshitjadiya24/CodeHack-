// Generated from the Supabase schema (project baanto). Regenerate after every migration.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          hash: string
          id: number
          org_id: string | null
          payload: Json
          prev_hash: string
          reason: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          hash?: string
          id?: never
          org_id?: string | null
          payload?: Json
          prev_hash?: string
          reason?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          hash?: string
          id?: never
          org_id?: string | null
          payload?: Json
          prev_hash?: string
          reason?: string | null
        }
        Relationships: [
          { foreignKeyName: "audit_log_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "audit_log_org_id_fkey"; columns: ["org_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
        ]
      }
      availability_windows: {
        Row: { end_time: string; id: string; resource_id: string; start_time: string; weekday: number }
        Insert: { end_time: string; id?: string; resource_id: string; start_time: string; weekday: number }
        Update: { end_time?: string; id?: string; resource_id?: string; start_time?: string; weekday?: number }
        Relationships: [
          { foreignKeyName: "availability_windows_resource_id_fkey"; columns: ["resource_id"]; isOneToOne: false; referencedRelation: "resources"; referencedColumns: ["id"] },
        ]
      }
      booking_feedback: {
        Row: { booking_id: string; comment: string | null; created_at: string; rating: number; resource_id: string; user_id: string }
        Insert: { booking_id: string; comment?: string | null; created_at?: string; rating: number; resource_id: string; user_id: string }
        Update: { booking_id?: string; comment?: string | null; created_at?: string; rating?: number; resource_id?: string; user_id?: string }
        Relationships: [
          { foreignKeyName: "booking_feedback_booking_id_fkey"; columns: ["booking_id"]; isOneToOne: true; referencedRelation: "bookings"; referencedColumns: ["id"] },
          { foreignKeyName: "booking_feedback_resource_id_fkey"; columns: ["resource_id"]; isOneToOne: false; referencedRelation: "resources"; referencedColumns: ["id"] },
          { foreignKeyName: "booking_feedback_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      bookings: {
        Row: {
          checked_in_at: string | null
          created_at: string
          credits: number
          deadline_note: string | null
          decided_at: string | null
          decided_by: string | null
          decision_receipt: Json | null
          draw_id: string | null
          ends_at: string
          id: string
          period: unknown
          priority_breakdown: Json | null
          priority_score: number | null
          purpose: string
          resource_id: string
          returned_at: string | null
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          user_id: string
          waitlist_position: number | null
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string
          credits?: number
          deadline_note?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_receipt?: Json | null
          draw_id?: string | null
          ends_at: string
          id?: string
          period?: unknown
          priority_breakdown?: Json | null
          priority_score?: number | null
          purpose: string
          resource_id: string
          returned_at?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          user_id: string
          waitlist_position?: number | null
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string
          credits?: number
          deadline_note?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_receipt?: Json | null
          draw_id?: string | null
          ends_at?: string
          id?: string
          period?: unknown
          priority_breakdown?: Json | null
          priority_score?: number | null
          purpose?: string
          resource_id?: string
          returned_at?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          user_id?: string
          waitlist_position?: number | null
        }
        Relationships: [
          { foreignKeyName: "bookings_decided_by_fkey"; columns: ["decided_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "bookings_draw_id_fkey"; columns: ["draw_id"]; isOneToOne: false; referencedRelation: "draw_windows"; referencedColumns: ["id"] },
          { foreignKeyName: "bookings_resource_id_fkey"; columns: ["resource_id"]; isOneToOne: false; referencedRelation: "resources"; referencedColumns: ["id"] },
          { foreignKeyName: "bookings_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      calendar_feeds: {
        Row: { created_at: string; token: string; user_id: string }
        Insert: { created_at?: string; token?: string; user_id: string }
        Update: { created_at?: string; token?: string; user_id?: string }
        Relationships: [
          { foreignKeyName: "calendar_feeds_user_id_fkey"; columns: ["user_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      deposits: {
        Row: { amount_inr: number; booking_id: string; collected_at: string; collected_by: string; method: string; reference: string; settle_reason: string | null; settled_at: string | null; settled_by: string | null; status: string; withheld_inr: number }
        Insert: { amount_inr: number; booking_id: string; collected_at?: string; collected_by: string; method: string; reference?: string; settle_reason?: string | null; settled_at?: string | null; settled_by?: string | null; status?: string; withheld_inr?: number }
        Update: { amount_inr?: number; booking_id?: string; collected_at?: string; collected_by?: string; method?: string; reference?: string; settle_reason?: string | null; settled_at?: string | null; settled_by?: string | null; status?: string; withheld_inr?: number }
        Relationships: [
          { foreignKeyName: "deposits_booking_id_fkey"; columns: ["booking_id"]; isOneToOne: true; referencedRelation: "bookings"; referencedColumns: ["id"] },
          { foreignKeyName: "deposits_collected_by_fkey"; columns: ["collected_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "deposits_settled_by_fkey"; columns: ["settled_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      departments: {
        Row: { code: string; id: string; name: string; org_id: string }
        Insert: { code: string; id?: string; name: string; org_id: string }
        Update: { code?: string; id?: string; name?: string; org_id?: string }
        Relationships: [
          { foreignKeyName: "departments_org_id_fkey"; columns: ["org_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
        ]
      }
      draw_windows: {
        Row: {
          closes_at: string
          commit_hash: string
          created_at: string
          drawn_at: string | null
          id: string
          resource_id: string
          results: Json | null
          seed: string | null
          slot_end: string
          slot_start: string
          status: string
        }
        Insert: {
          closes_at: string
          commit_hash: string
          created_at?: string
          drawn_at?: string | null
          id?: string
          resource_id: string
          results?: Json | null
          seed?: string | null
          slot_end: string
          slot_start: string
          status?: string
        }
        Update: {
          closes_at?: string
          commit_hash?: string
          created_at?: string
          drawn_at?: string | null
          id?: string
          resource_id?: string
          results?: Json | null
          seed?: string | null
          slot_end?: string
          slot_start?: string
          status?: string
        }
        Relationships: [
          { foreignKeyName: "draw_windows_resource_id_fkey"; columns: ["resource_id"]; isOneToOne: false; referencedRelation: "resources"; referencedColumns: ["id"] },
        ]
      }
      draw_secrets: {
        Row: { draw_id: string; seed: string }
        Insert: { draw_id: string; seed: string }
        Update: { draw_id?: string; seed?: string }
        Relationships: [
          { foreignKeyName: "draw_secrets_draw_id_fkey"; columns: ["draw_id"]; isOneToOne: true; referencedRelation: "draw_windows"; referencedColumns: ["id"] },
        ]
      }
      email_codes: {
        Row: { attempts: number; code_hash: string; email: string; expires_at: string; last_sent_at: string; user_id: string }
        Insert: { attempts?: number; code_hash: string; email: string; expires_at: string; last_sent_at?: string; user_id: string }
        Update: { attempts?: number; code_hash?: string; email?: string; expires_at?: string; last_sent_at?: string; user_id?: string }
        Relationships: []
      }
      endorsements: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          home_org_id: string
          host_org_id: string
          id: string
          purpose: string
          status: "requested" | "approved" | "declined" | "revoked"
          user_id: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          home_org_id: string
          host_org_id: string
          id?: string
          purpose: string
          status?: "requested" | "approved" | "declined" | "revoked"
          user_id: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          home_org_id?: string
          host_org_id?: string
          id?: string
          purpose?: string
          status?: "requested" | "approved" | "declined" | "revoked"
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          { foreignKeyName: "endorsements_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "endorsements_home_org_id_fkey"; columns: ["home_org_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "endorsements_host_org_id_fkey"; columns: ["host_org_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "endorsements_decided_by_fkey"; columns: ["decided_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      fairness_config: {
        Row: {
          cooldown_hours: number
          deadline_bonus: number
          first_time_bonus: number
          max_active_high_demand: number
          org_id: string
          strike_penalty: number
          updated_at: string
          usage_penalty_per_hour: number
          weekly_credits: number
        }
        Insert: {
          cooldown_hours?: number
          deadline_bonus?: number
          first_time_bonus?: number
          max_active_high_demand?: number
          org_id: string
          strike_penalty?: number
          updated_at?: string
          usage_penalty_per_hour?: number
          weekly_credits?: number
        }
        Update: {
          cooldown_hours?: number
          deadline_bonus?: number
          first_time_bonus?: number
          max_active_high_demand?: number
          org_id?: string
          strike_penalty?: number
          updated_at?: string
          usage_penalty_per_hour?: number
          weekly_credits?: number
        }
        Relationships: [
          { foreignKeyName: "fairness_config_org_id_fkey"; columns: ["org_id"]; isOneToOne: true; referencedRelation: "organizations"; referencedColumns: ["id"] },
        ]
      }
      handovers: {
        Row: {
          ai_flag: boolean | null
          ai_summary: string | null
          attendant_confirmed_at: string | null
          attendant_id: string | null
          booking_id: string
          checklist: Json
          created_at: string
          id: string
          notes: string
          phase: Database["public"]["Enums"]["handover_phase"]
          photo_paths: string[]
          recorded_by: string
        }
        Insert: {
          ai_flag?: boolean | null
          ai_summary?: string | null
          attendant_confirmed_at?: string | null
          attendant_id?: string | null
          booking_id: string
          checklist?: Json
          created_at?: string
          id?: string
          notes?: string
          phase: Database["public"]["Enums"]["handover_phase"]
          photo_paths?: string[]
          recorded_by: string
        }
        Update: {
          ai_flag?: boolean | null
          ai_summary?: string | null
          attendant_confirmed_at?: string | null
          attendant_id?: string | null
          booking_id?: string
          checklist?: Json
          created_at?: string
          id?: string
          notes?: string
          phase?: Database["public"]["Enums"]["handover_phase"]
          photo_paths?: string[]
          recorded_by?: string
        }
        Relationships: [
          { foreignKeyName: "handovers_attendant_id_fkey"; columns: ["attendant_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "handovers_booking_id_fkey"; columns: ["booking_id"]; isOneToOne: false; referencedRelation: "bookings"; referencedColumns: ["id"] },
          { foreignKeyName: "handovers_recorded_by_fkey"; columns: ["recorded_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      incidents: {
        Row: {
          ai_summary: string | null
          borrower_response: string | null
          disputed_at: string | null
          booking_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          description: string
          id: string
          proposed_action: string | null
          reported_by: string | null
          resource_id: string
          severity: Database["public"]["Enums"]["severity"]
          status: Database["public"]["Enums"]["incident_status"]
          strike_applied: boolean
          type: Database["public"]["Enums"]["incident_type"]
        }
        Insert: {
          ai_summary?: string | null
          borrower_response?: string | null
          disputed_at?: string | null
          booking_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          description: string
          id?: string
          proposed_action?: string | null
          reported_by?: string | null
          resource_id: string
          severity?: Database["public"]["Enums"]["severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          strike_applied?: boolean
          type: Database["public"]["Enums"]["incident_type"]
        }
        Update: {
          ai_summary?: string | null
          borrower_response?: string | null
          disputed_at?: string | null
          booking_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          description?: string
          id?: string
          proposed_action?: string | null
          reported_by?: string | null
          resource_id?: string
          severity?: Database["public"]["Enums"]["severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          strike_applied?: boolean
          type?: Database["public"]["Enums"]["incident_type"]
        }
        Relationships: [
          { foreignKeyName: "incidents_booking_id_fkey"; columns: ["booking_id"]; isOneToOne: false; referencedRelation: "bookings"; referencedColumns: ["id"] },
          { foreignKeyName: "incidents_decided_by_fkey"; columns: ["decided_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "incidents_reported_by_fkey"; columns: ["reported_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "incidents_resource_id_fkey"; columns: ["resource_id"]; isOneToOne: false; referencedRelation: "resources"; referencedColumns: ["id"] },
        ]
      }
      maintenance_windows: {
        Row: { created_at: string; created_by: string | null; ends_at: string; id: string; reason: string; resource_id: string; starts_at: string }
        Insert: { created_at?: string; created_by?: string | null; ends_at: string; id?: string; reason: string; resource_id: string; starts_at: string }
        Update: { created_at?: string; created_by?: string | null; ends_at?: string; id?: string; reason?: string; resource_id?: string; starts_at?: string }
        Relationships: [
          { foreignKeyName: "maintenance_windows_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "maintenance_windows_resource_id_fkey"; columns: ["resource_id"]; isOneToOne: false; referencedRelation: "resources"; referencedColumns: ["id"] },
        ]
      }
      notifications: {
        Row: { body: string; created_at: string; id: string; kind: string; link: string | null; read_at: string | null; title: string; user_id: string }
        Insert: { body?: string; created_at?: string; id?: string; kind: string; link?: string | null; read_at?: string | null; title: string; user_id: string }
        Update: { body?: string; created_at?: string; id?: string; kind?: string; link?: string | null; read_at?: string | null; title?: string; user_id?: string }
        Relationships: [
          { foreignKeyName: "notifications_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      organizations: {
        Row: { is_demo: boolean; lat: number | null; lng: number | null; aishe_code: string | null; city: string | null; created_at: string; created_by: string | null; email_domain: string | null; id: string; kind: string; name: string; slug: string; state: string | null; status: string; website: string | null }
        Insert: { is_demo?: boolean; lat?: number | null; lng?: number | null; aishe_code?: string | null; city?: string | null; created_at?: string; created_by?: string | null; email_domain?: string | null; id?: string; kind?: string; name: string; slug: string; state?: string | null; status?: string; website?: string | null }
        Update: { is_demo?: boolean; lat?: number | null; lng?: number | null; aishe_code?: string | null; city?: string | null; created_at?: string; created_by?: string | null; email_domain?: string | null; id?: string; kind?: string; name?: string; slug?: string; state?: string | null; status?: string; website?: string | null }
        Relationships: []
      }
      platform_staff: {
        Row: { added_at: string; user_id: string }
        Insert: { added_at?: string; user_id: string }
        Update: { added_at?: string; user_id?: string }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          dept_id: string | null
          full_name: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["user_role"]
          roll_no: string | null
          strikes: number
          verified: boolean
        }
        Insert: {
          created_at?: string
          dept_id?: string | null
          full_name: string
          id: string
          org_id: string
          role?: Database["public"]["Enums"]["user_role"]
          roll_no?: string | null
          strikes?: number
          verified?: boolean
        }
        Update: {
          created_at?: string
          dept_id?: string | null
          full_name?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          roll_no?: string | null
          strikes?: number
          verified?: boolean
        }
        Relationships: [
          { foreignKeyName: "profiles_dept_id_fkey"; columns: ["dept_id"]; isOneToOne: false; referencedRelation: "departments"; referencedColumns: ["id"] },
          { foreignKeyName: "profiles_org_id_fkey"; columns: ["org_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
        ]
      }
      resource_requirements: {
        Row: { badge_id: string; resource_id: string }
        Insert: { badge_id: string; resource_id: string }
        Update: { badge_id?: string; resource_id?: string }
        Relationships: [
          { foreignKeyName: "resource_requirements_badge_id_fkey"; columns: ["badge_id"]; isOneToOne: false; referencedRelation: "skill_badges"; referencedColumns: ["id"] },
          { foreignKeyName: "resource_requirements_resource_id_fkey"; columns: ["resource_id"]; isOneToOne: false; referencedRelation: "resources"; referencedColumns: ["id"] },
        ]
      }
      resources: {
        Row: {
          lat: number | null
          lng: number | null
          auto_approve: boolean
          category: string
          checklist: Json
          created_at: string
          credit_rate: number
          demand: Database["public"]["Enums"]["demand_tier"]
          deposit_inr: number
          dept_id: string | null
          description: string
          id: string
          image_url: string | null
          kind: Database["public"]["Enums"]["resource_kind"]
          location: string
          max_hours: number
          name: string
          open_to_partners: boolean
          org_id: string
          owner_id: string
          photo_slots: Json
          qr_token: string
          rental_value_inr_per_hour: number
          requires_supervision: boolean
          rules: string
          status: Database["public"]["Enums"]["resource_status"]
        }
        Insert: {
          lat?: number | null
          lng?: number | null
          auto_approve?: boolean
          category: string
          checklist?: Json
          created_at?: string
          credit_rate?: number
          demand?: Database["public"]["Enums"]["demand_tier"]
          deposit_inr?: number
          dept_id?: string | null
          description?: string
          id?: string
          image_url?: string | null
          kind?: Database["public"]["Enums"]["resource_kind"]
          location: string
          max_hours?: number
          name: string
          open_to_partners?: boolean
          org_id: string
          owner_id: string
          photo_slots?: Json
          qr_token?: string
          rental_value_inr_per_hour?: number
          requires_supervision?: boolean
          rules?: string
          status?: Database["public"]["Enums"]["resource_status"]
        }
        Update: {
          lat?: number | null
          lng?: number | null
          auto_approve?: boolean
          category?: string
          checklist?: Json
          created_at?: string
          credit_rate?: number
          demand?: Database["public"]["Enums"]["demand_tier"]
          deposit_inr?: number
          dept_id?: string | null
          description?: string
          id?: string
          image_url?: string | null
          kind?: Database["public"]["Enums"]["resource_kind"]
          location?: string
          max_hours?: number
          name?: string
          open_to_partners?: boolean
          org_id?: string
          owner_id?: string
          photo_slots?: Json
          qr_token?: string
          rental_value_inr_per_hour?: number
          requires_supervision?: boolean
          rules?: string
          status?: Database["public"]["Enums"]["resource_status"]
        }
        Relationships: [
          { foreignKeyName: "resources_dept_id_fkey"; columns: ["dept_id"]; isOneToOne: false; referencedRelation: "departments"; referencedColumns: ["id"] },
          { foreignKeyName: "resources_org_id_fkey"; columns: ["org_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "resources_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      skill_badges: {
        Row: { code: string; description: string; id: string; name: string; org_id: string; validity_days: number }
        Insert: { code: string; description?: string; id?: string; name: string; org_id: string; validity_days?: number }
        Update: { code?: string; description?: string; id?: string; name?: string; org_id?: string; validity_days?: number }
        Relationships: [
          { foreignKeyName: "skill_badges_org_id_fkey"; columns: ["org_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          created_at: string
          evidence_path: string | null
          expires_at: string | null
          id: string
          issued_at: string | null
          issued_by: string | null
          note: string | null
          status: Database["public"]["Enums"]["badge_status"]
          user_id: string
        }
        Insert: {
          badge_id: string
          created_at?: string
          evidence_path?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          note?: string | null
          status?: Database["public"]["Enums"]["badge_status"]
          user_id: string
        }
        Update: {
          badge_id?: string
          created_at?: string
          evidence_path?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          note?: string | null
          status?: Database["public"]["Enums"]["badge_status"]
          user_id?: string
        }
        Relationships: [
          { foreignKeyName: "user_badges_badge_id_fkey"; columns: ["badge_id"]; isOneToOne: false; referencedRelation: "skill_badges"; referencedColumns: ["id"] },
          { foreignKeyName: "user_badges_issued_by_fkey"; columns: ["issued_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "user_badges_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      rate_limit_hit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      apply_booking_transition: {
        Args: {
          p_actor: string
          p_booking: string
          p_notify_body?: string
          p_notify_title?: string
          p_patch?: Json
          p_reason?: string
          p_to: Database["public"]["Enums"]["booking_status"]
        }
        Returns: Database["public"]["Tables"]["bookings"]["Row"]
      }
      extend_booking: {
        Args: { p_booking: string; p_new_end: string; p_actor: string; p_reason: string }
        Returns: Database["public"]["Tables"]["bookings"]["Row"]
      }
      booking_transition_allowed: {
        Args: {
          p_from: Database["public"]["Enums"]["booking_status"]
          p_to: Database["public"]["Enums"]["booking_status"]
        }
        Returns: boolean
      }
      can_see_booking: { Args: { p_booking: string }; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      my_org: { Args: never; Returns: string }
      my_role: { Args: never; Returns: Database["public"]["Enums"]["user_role"] }
      verify_audit_chain: {
        Args: never
        Returns: { broken_at: number | null; checked: number; ok: boolean }[]
      }
      same_world: { Args: { a: string; b: string }; Returns: boolean }
      weekly_nudges: { Args: never; Returns: Json }
    }
    Enums: {
      badge_status: "pending" | "verified" | "rejected" | "expired"
      booking_status:
        | "requested"
        | "in_draw"
        | "waitlisted"
        | "approved"
        | "rejected"
        | "cancelled"
        | "checked_in"
        | "overdue"
        | "returned"
        | "closed"
      demand_tier: "normal" | "high"
      handover_phase: "check_in" | "return"
      incident_status: "open" | "under_review" | "resolved"
      incident_type: "damage" | "delay" | "conflict" | "misuse" | "safety"
      resource_kind: "equipment" | "space"
      resource_status: "active" | "maintenance" | "retired"
      severity: "low" | "medium" | "high"
      user_role: "student" | "researcher" | "owner" | "attendant" | "manager" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
