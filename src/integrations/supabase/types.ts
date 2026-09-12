export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      family_relationships: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          learner_user_id: string;
          organization_id: string;
          parent_user_id: string;
          relationship: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          learner_user_id: string;
          organization_id: string;
          parent_user_id: string;
          relationship?: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          learner_user_id?: string;
          organization_id?: string;
          parent_user_id?: string;
          relationship?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "family_relationships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_memberships: {
        Row: {
          created_at: string;
          id: string;
          invited_by: string | null;
          is_default: boolean;
          organization_id: string;
          role: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          invited_by?: string | null;
          is_default?: boolean;
          organization_id: string;
          role: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          invited_by?: string | null;
          is_default?: boolean;
          organization_id?: string;
          role?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          accent_color: string;
          created_at: string;
          created_by: string | null;
          custom_domain: string | null;
          default_locale: string;
          enabled_locales: string[];
          feature_flags: Json;
          id: string;
          logo_url: string | null;
          name: string;
          primary_color: string;
          slug: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          accent_color?: string;
          created_at?: string;
          created_by?: string | null;
          custom_domain?: string | null;
          default_locale?: string;
          enabled_locales?: string[];
          feature_flags?: Json;
          id?: string;
          logo_url?: string | null;
          name: string;
          primary_color?: string;
          slug: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          accent_color?: string;
          created_at?: string;
          created_by?: string | null;
          custom_domain?: string | null;
          default_locale?: string;
          enabled_locales?: string[];
          feature_flags?: Json;
          id?: string;
          logo_url?: string | null;
          name?: string;
          primary_color?: string;
          slug?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          organization_id: string | null;
          session_date: string | null;
          status: string | null;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          session_date?: string | null;
          status?: string | null;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          session_date?: string | null;
          status?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      cohorts: {
        Row: {
          created_at: string | null;
          id: string;
          name: string;
          organization_id: string | null;
          teacher_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          name: string;
          organization_id?: string | null;
          teacher_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          name?: string;
          organization_id?: string | null;
          teacher_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cohorts_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      homework_submissions: {
        Row: {
          created_at: string | null;
          feedback_text: string | null;
          file_url: string | null;
          id: string;
          lesson_id: string | null;
          organization_id: string | null;
          status: string | null;
          type: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          feedback_text?: string | null;
          file_url?: string | null;
          id?: string;
          lesson_id?: string | null;
          organization_id?: string | null;
          status?: string | null;
          type?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          feedback_text?: string | null;
          file_url?: string | null;
          id?: string;
          lesson_id?: string | null;
          organization_id?: string | null;
          status?: string | null;
          type?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "homework_submissions_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "homework_submissions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          created_at: string | null;
          duration_minutes: number | null;
          id: string;
          order_index: number | null;
          organization_id: string | null;
          quiz_questions: Json | null;
          title: string;
          video_url: string | null;
        };
        Insert: {
          created_at?: string | null;
          duration_minutes?: number | null;
          id?: string;
          order_index?: number | null;
          organization_id?: string | null;
          quiz_questions?: Json | null;
          title: string;
          video_url?: string | null;
        };
        Update: {
          created_at?: string | null;
          duration_minutes?: number | null;
          id?: string;
          order_index?: number | null;
          organization_id?: string | null;
          quiz_questions?: Json | null;
          title?: string;
          video_url?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          cohort_name: string | null;
          created_at: string | null;
          avatar_url: string | null;
          full_name: string | null;
          id: string;
          parent_id: string | null;
          phone: string | null;
          preferred_name: string | null;
          role: string;
          locale: string;
          updated_at: string;
        };
        Insert: {
          cohort_name?: string | null;
          created_at?: string | null;
          avatar_url?: string | null;
          full_name?: string | null;
          id: string;
          parent_id?: string | null;
          phone?: string | null;
          preferred_name?: string | null;
          role: string;
          locale?: string;
          updated_at?: string;
        };
        Update: {
          cohort_name?: string | null;
          created_at?: string | null;
          avatar_url?: string | null;
          full_name?: string | null;
          id?: string;
          parent_id?: string | null;
          phone?: string | null;
          preferred_name?: string | null;
          role?: string;
          locale?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      progress: {
        Row: {
          completed_at: string | null;
          id: string;
          lesson_id: string | null;
          organization_id: string | null;
          status: string | null;
          user_id: string | null;
        };
        Insert: {
          completed_at?: string | null;
          id?: string;
          lesson_id?: string | null;
          organization_id?: string | null;
          status?: string | null;
          user_id?: string | null;
        };
        Update: {
          completed_at?: string | null;
          id?: string;
          lesson_id?: string | null;
          organization_id?: string | null;
          status?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "progress_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_results: {
        Row: {
          completed_at: string | null;
          id: string;
          lesson_id: string | null;
          organization_id: string | null;
          score: number | null;
          user_id: string | null;
        };
        Insert: {
          completed_at?: string | null;
          id?: string;
          lesson_id?: string | null;
          organization_id?: string | null;
          score?: number | null;
          user_id?: string | null;
        };
        Update: {
          completed_at?: string | null;
          id?: string;
          lesson_id?: string | null;
          organization_id?: string | null;
          score?: number | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_results_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_results_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      regularity_score: {
        Row: {
          level: string | null;
          organization_id: string | null;
          score: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          level?: string | null;
          organization_id?: string | null;
          score?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          level?: string | null;
          organization_id?: string | null;
          score?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "regularity_score_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
