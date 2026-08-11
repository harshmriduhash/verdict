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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kits: {
        Row: {
          created_at: string
          fonts: Json
          id: string
          logo_url: string | null
          name: string
          pacing_profile: Json
          primary_colors: Json
          tone_of_voice: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          fonts?: Json
          id?: string
          logo_url?: string | null
          name: string
          pacing_profile?: Json
          primary_colors?: Json
          tone_of_voice?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          fonts?: Json
          id?: string
          logo_url?: string | null
          name?: string
          pacing_profile?: Json
          primary_colors?: Json
          tone_of_voice?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      findings: {
        Row: {
          agent: Database["public"]["Enums"]["agent_type"]
          created_at: string
          deterministic: boolean
          downweighted: boolean
          end_ms: number | null
          evidence: string | null
          explanation: string
          id: string
          project_id: string
          resolved_by: string | null
          severity: Database["public"]["Enums"]["severity_type"]
          status: Database["public"]["Enums"]["finding_status"]
          timestamp_ms: number
          title: string
          workspace_id: string
        }
        Insert: {
          agent: Database["public"]["Enums"]["agent_type"]
          created_at?: string
          deterministic?: boolean
          downweighted?: boolean
          end_ms?: number | null
          evidence?: string | null
          explanation: string
          id?: string
          project_id: string
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["severity_type"]
          status?: Database["public"]["Enums"]["finding_status"]
          timestamp_ms?: number
          title: string
          workspace_id: string
        }
        Update: {
          agent?: Database["public"]["Enums"]["agent_type"]
          created_at?: string
          deterministic?: boolean
          downweighted?: boolean
          end_ms?: number | null
          evidence?: string | null
          explanation?: string
          id?: string
          project_id?: string
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["severity_type"]
          status?: Database["public"]["Enums"]["finding_status"]
          timestamp_ms?: number
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "findings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          onboarded: boolean
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          onboarded?: boolean
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          onboarded?: boolean
        }
        Relationships: []
      }
      project_shots: {
        Row: {
          end_ms: number
          id: string
          project_id: string
          shot_index: number
          start_ms: number
          workspace_id: string
        }
        Insert: {
          end_ms: number
          id?: string
          project_id: string
          shot_index: number
          start_ms: number
          workspace_id: string
        }
        Update: {
          end_ms?: number
          id?: string
          project_id?: string
          shot_index?: number
          start_ms?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_shots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_shots_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_transcript_segments: {
        Row: {
          end_ms: number
          id: string
          project_id: string
          speaker_label: string | null
          start_ms: number
          text: string
          workspace_id: string
        }
        Insert: {
          end_ms: number
          id?: string
          project_id: string
          speaker_label?: string | null
          start_ms: number
          text: string
          workspace_id: string
        }
        Update: {
          end_ms?: number
          id?: string
          project_id?: string
          speaker_label?: string | null
          start_ms?: number
          text?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_transcript_segments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_transcript_segments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          brand_kit_id: string | null
          completed_at: string | null
          context_note: string | null
          created_at: string
          degraded: boolean
          degraded_reason: string | null
          duration_seconds: number | null
          error_message: string | null
          height: number | null
          id: string
          idempotency_key: string | null
          scores: Json
          source_video_url: string | null
          status: Database["public"]["Enums"]["project_status"]
          storage_path: string | null
          title: string
          uploaded_by: string
          verdict: Database["public"]["Enums"]["verdict_type"] | null
          verdict_summary: string | null
          width: number | null
          workspace_id: string
        }
        Insert: {
          brand_kit_id?: string | null
          completed_at?: string | null
          context_note?: string | null
          created_at?: string
          degraded?: boolean
          degraded_reason?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          height?: number | null
          id?: string
          idempotency_key?: string | null
          scores?: Json
          source_video_url?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          storage_path?: string | null
          title: string
          uploaded_by: string
          verdict?: Database["public"]["Enums"]["verdict_type"] | null
          verdict_summary?: string | null
          width?: number | null
          workspace_id: string
        }
        Update: {
          brand_kit_id?: string | null
          completed_at?: string | null
          context_note?: string | null
          created_at?: string
          degraded?: boolean
          degraded_reason?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          height?: number | null
          id?: string
          idempotency_key?: string | null
          scores?: Json
          source_video_url?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          storage_path?: string | null
          title?: string
          uploaded_by?: string
          verdict?: Database["public"]["Enums"]["verdict_type"] | null
          verdict_summary?: string | null
          width?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_videos: {
        Row: {
          added_at: string
          avg_shot_seconds: number | null
          brand_kit_id: string
          duration_seconds: number | null
          id: string
          label: string | null
          storage_path: string
          workspace_id: string
        }
        Insert: {
          added_at?: string
          avg_shot_seconds?: number | null
          brand_kit_id: string
          duration_seconds?: number | null
          id?: string
          label?: string | null
          storage_path: string
          workspace_id: string
        }
        Update: {
          added_at?: string
          avg_shot_seconds?: number | null
          brand_kit_id?: string
          duration_seconds?: number | null
          id?: string
          label?: string | null
          storage_path?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_videos_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reference_videos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      taste_preferences: {
        Row: {
          agent: Database["public"]["Enums"]["agent_type"]
          brand_kit_id: string
          confidence_score: number
          created_at: string
          direction: string
          id: string
          last_reinforced_at: string
          override_count: number
          preference_text: string
          signal_key: string
          source_finding_id: string | null
          workspace_id: string
        }
        Insert: {
          agent: Database["public"]["Enums"]["agent_type"]
          brand_kit_id: string
          confidence_score?: number
          created_at?: string
          direction?: string
          id?: string
          last_reinforced_at?: string
          override_count?: number
          preference_text: string
          signal_key: string
          source_finding_id?: string | null
          workspace_id: string
        }
        Update: {
          agent?: Database["public"]["Enums"]["agent_type"]
          brand_kit_id?: string
          confidence_score?: number
          created_at?: string
          direction?: string
          id?: string
          last_reinforced_at?: string
          override_count?: number
          preference_text?: string
          signal_key?: string
          source_finding_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "taste_preferences_brand_kit_id_fkey"
            columns: ["brand_kit_id"]
            isOneToOne: false
            referencedRelation: "brand_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taste_preferences_source_finding_id_fkey"
            columns: ["source_finding_id"]
            isOneToOne: false
            referencedRelation: "findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taste_preferences_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          id: string
          invited_email: string | null
          joined_at: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          invited_email?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          invited_email?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          name: string
          plan: string
          slug: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          name: string
          plan?: string
          slug: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          name?: string
          plan?: string
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_workspace_role: {
        Args: {
          _roles: Database["public"]["Enums"]["member_role"][]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      is_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      agent_type: "technical" | "pacing" | "brand"
      finding_status: "open" | "approved" | "fix_confirmed"
      member_role: "owner" | "admin" | "editor" | "viewer"
      project_status:
        | "uploaded"
        | "decomposing"
        | "reviewing"
        | "complete"
        | "failed"
      severity_type: "info" | "warn" | "critical"
      verdict_type: "ship" | "fix" | "escalate"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      agent_type: ["technical", "pacing", "brand"],
      finding_status: ["open", "approved", "fix_confirmed"],
      member_role: ["owner", "admin", "editor", "viewer"],
      project_status: [
        "uploaded",
        "decomposing",
        "reviewing",
        "complete",
        "failed",
      ],
      severity_type: ["info", "warn", "critical"],
      verdict_type: ["ship", "fix", "escalate"],
    },
  },
} as const
