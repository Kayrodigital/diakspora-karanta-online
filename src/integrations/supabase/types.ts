export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
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
            foreignKeyName: "attendance_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_user_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: number;
          metadata: Json;
          organization_id: string | null;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: number;
          metadata?: Json;
          organization_id?: string | null;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: number;
          metadata?: Json;
          organization_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      books: {
        Row: {
          author: string | null;
          cover_url: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          level: string | null;
          metadata: Json;
          organization_id: string;
          source_language: string;
          status: string;
          subject_id: string | null;
          subtitle: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          author?: string | null;
          cover_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          level?: string | null;
          metadata?: Json;
          organization_id: string;
          source_language?: string;
          status?: string;
          subject_id?: string | null;
          subtitle?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          author?: string | null;
          cover_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          level?: string | null;
          metadata?: Json;
          organization_id?: string;
          source_language?: string;
          status?: string;
          subject_id?: string | null;
          subtitle?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "books_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "books_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "books_subject_same_organization";
            columns: ["subject_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      cohort_memberships: {
        Row: {
          cohort_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          joined_at: string;
          organization_id: string;
          role: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cohort_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          joined_at?: string;
          organization_id: string;
          role?: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cohort_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          joined_at?: string;
          organization_id?: string;
          role?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cohort_memberships_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cohort_memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      cohorts: {
        Row: {
          code: string | null;
          created_at: string;
          description: string | null;
          ends_on: string | null;
          id: string;
          level: string | null;
          max_students: number | null;
          name: string;
          organization_id: string;
          starts_on: string | null;
          status: string;
          teacher_id: string | null;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          code?: string | null;
          created_at?: string;
          description?: string | null;
          ends_on?: string | null;
          id?: string;
          level?: string | null;
          max_students?: number | null;
          name: string;
          organization_id: string;
          starts_on?: string | null;
          status?: string;
          teacher_id?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          code?: string | null;
          created_at?: string;
          description?: string | null;
          ends_on?: string | null;
          id?: string;
          level?: string | null;
          max_students?: number | null;
          name?: string;
          organization_id?: string;
          starts_on?: string | null;
          status?: string;
          teacher_id?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cohorts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cohorts_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      course_cohorts: {
        Row: {
          assigned_at: string;
          assigned_by: string | null;
          cohort_id: string;
          course_id: string;
          organization_id: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by?: string | null;
          cohort_id: string;
          course_id: string;
          organization_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string | null;
          cohort_id?: string;
          course_id?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_cohorts_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_cohorts_cohort_same_organization";
            columns: ["cohort_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "course_cohorts_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_cohorts_course_same_organization";
            columns: ["course_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "course_cohorts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      course_enrollments: {
        Row: {
          completed_at: string | null;
          course_id: string;
          enrolled_at: string;
          enrolled_by: string | null;
          id: string;
          organization_id: string;
          status: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          course_id: string;
          enrolled_at?: string;
          enrolled_by?: string | null;
          id?: string;
          organization_id: string;
          status?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          course_id?: string;
          enrolled_at?: string;
          enrolled_by?: string | null;
          id?: string;
          organization_id?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_enrollments_course_same_organization";
            columns: ["course_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "course_enrollments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      course_modules: {
        Row: {
          available_from: string | null;
          course_id: string;
          created_at: string;
          description: string | null;
          id: string;
          order_index: number;
          organization_id: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          available_from?: string | null;
          course_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          order_index?: number;
          organization_id: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          available_from?: string | null;
          course_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          order_index?: number;
          organization_id?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_modules_course_same_organization";
            columns: ["course_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "course_modules_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          access_scope: string;
          book_id: string | null;
          cover_url: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          language: string;
          learning_objectives: string[];
          level: string | null;
          organization_id: string;
          published_at: string | null;
          slug: string;
          status: string;
          subject_id: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          access_scope?: string;
          book_id?: string | null;
          cover_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          language?: string;
          learning_objectives?: string[];
          level?: string | null;
          organization_id: string;
          published_at?: string | null;
          slug: string;
          status?: string;
          subject_id?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          access_scope?: string;
          book_id?: string | null;
          cover_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          language?: string;
          learning_objectives?: string[];
          level?: string | null;
          organization_id?: string;
          published_at?: string | null;
          slug?: string;
          status?: string;
          subject_id?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courses_book_same_organization";
            columns: ["book_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "courses_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courses_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courses_subject_same_organization";
            columns: ["subject_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
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
      homework_submissions: {
        Row: {
          created_at: string;
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
          created_at?: string;
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
          created_at?: string;
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
            foreignKeyName: "homework_submissions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
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
      lesson_resources: {
        Row: {
          allow_download: boolean;
          created_at: string;
          created_by: string | null;
          description: string | null;
          duration_seconds: number | null;
          external_url: string | null;
          file_size_bytes: number | null;
          id: string;
          lesson_id: string;
          mime_type: string | null;
          order_index: number;
          organization_id: string;
          resource_type: string;
          status: string;
          storage_path: string | null;
          title: string;
          transcript: string | null;
          updated_at: string;
        };
        Insert: {
          allow_download?: boolean;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          duration_seconds?: number | null;
          external_url?: string | null;
          file_size_bytes?: number | null;
          id?: string;
          lesson_id: string;
          mime_type?: string | null;
          order_index?: number;
          organization_id: string;
          resource_type: string;
          status?: string;
          storage_path?: string | null;
          title: string;
          transcript?: string | null;
          updated_at?: string;
        };
        Update: {
          allow_download?: boolean;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          duration_seconds?: number | null;
          external_url?: string | null;
          file_size_bytes?: number | null;
          id?: string;
          lesson_id?: string;
          mime_type?: string | null;
          order_index?: number;
          organization_id?: string;
          resource_type?: string;
          status?: string;
          storage_path?: string | null;
          title?: string;
          transcript?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_resources_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_resources_lesson_same_organization";
            columns: ["lesson_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "lesson_resources_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          content: Json;
          course_id: string | null;
          created_at: string;
          created_by: string | null;
          duration_minutes: number | null;
          id: string;
          is_preview: boolean;
          lesson_type: string;
          module_id: string | null;
          order_index: number | null;
          organization_id: string;
          status: string;
          summary: string | null;
          title: string;
          updated_at: string;
          video_url: string | null;
        };
        Insert: {
          content?: Json;
          course_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          duration_minutes?: number | null;
          id?: string;
          is_preview?: boolean;
          lesson_type?: string;
          module_id?: string | null;
          order_index?: number | null;
          organization_id: string;
          status?: string;
          summary?: string | null;
          title: string;
          updated_at?: string;
          video_url?: string | null;
        };
        Update: {
          content?: Json;
          course_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          duration_minutes?: number | null;
          id?: string;
          is_preview?: boolean;
          lesson_type?: string;
          module_id?: string | null;
          order_index?: number | null;
          organization_id?: string;
          status?: string;
          summary?: string | null;
          title?: string;
          updated_at?: string;
          video_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lessons_course_same_organization";
            columns: ["course_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "lessons_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "course_modules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lessons_module_same_organization";
            columns: ["module_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "course_modules";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "lessons_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      live_sessions: {
        Row: {
          cohort_id: string | null;
          course_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          ends_at: string | null;
          external_meeting_id: string | null;
          host_user_id: string | null;
          id: string;
          join_url: string | null;
          lesson_id: string | null;
          organization_id: string;
          provider: string;
          recording_status: string;
          reminder_sent_at: string | null;
          replay_url: string | null;
          starts_at: string;
          status: string;
          timezone: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          cohort_id?: string | null;
          course_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_at?: string | null;
          external_meeting_id?: string | null;
          host_user_id?: string | null;
          id?: string;
          join_url?: string | null;
          lesson_id?: string | null;
          organization_id: string;
          provider?: string;
          recording_status?: string;
          reminder_sent_at?: string | null;
          replay_url?: string | null;
          starts_at: string;
          status?: string;
          timezone?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          cohort_id?: string | null;
          course_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          ends_at?: string | null;
          external_meeting_id?: string | null;
          host_user_id?: string | null;
          id?: string;
          join_url?: string | null;
          lesson_id?: string | null;
          organization_id?: string;
          provider?: string;
          recording_status?: string;
          reminder_sent_at?: string | null;
          replay_url?: string | null;
          starts_at?: string;
          status?: string;
          timezone?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "live_sessions_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "live_sessions_cohort_same_organization";
            columns: ["cohort_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "live_sessions_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "live_sessions_course_same_organization";
            columns: ["course_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "live_sessions_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "live_sessions_lesson_same_organization";
            columns: ["lesson_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "live_sessions_organization_id_fkey";
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
      platform_administrators: {
        Row: {
          created_at: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          role?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          cohort_name: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          locale: string;
          parent_id: string | null;
          phone: string | null;
          preferred_name: string | null;
          role: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          cohort_name?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          locale?: string;
          parent_id?: string | null;
          phone?: string | null;
          preferred_name?: string | null;
          role?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          cohort_name?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          locale?: string;
          parent_id?: string | null;
          phone?: string | null;
          preferred_name?: string | null;
          role?: string;
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
            foreignKeyName: "progress_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
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
      quiz_answers: {
        Row: {
          answered_at: string;
          attempt_id: string;
          id: string;
          is_correct: boolean | null;
          organization_id: string;
          points_awarded: number | null;
          question_id: string;
          selected_option_ids: string[];
          text_answer: string | null;
        };
        Insert: {
          answered_at?: string;
          attempt_id: string;
          id?: string;
          is_correct?: boolean | null;
          organization_id: string;
          points_awarded?: number | null;
          question_id: string;
          selected_option_ids?: string[];
          text_answer?: string | null;
        };
        Update: {
          answered_at?: string;
          attempt_id?: string;
          id?: string;
          is_correct?: boolean | null;
          organization_id?: string;
          points_awarded?: number | null;
          question_id?: string;
          selected_option_ids?: string[];
          text_answer?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_answers_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "quiz_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_answers_attempt_same_organization";
            columns: ["attempt_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "quiz_attempts";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "quiz_answers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "quiz_questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_answers_question_same_organization";
            columns: ["question_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "quiz_questions";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      quiz_attempts: {
        Row: {
          attempt_number: number;
          graded_at: string | null;
          id: string;
          organization_id: string;
          quiz_id: string;
          score: number | null;
          started_at: string;
          status: string;
          submitted_at: string | null;
          user_id: string;
        };
        Insert: {
          attempt_number?: number;
          graded_at?: string | null;
          id?: string;
          organization_id: string;
          quiz_id: string;
          score?: number | null;
          started_at?: string;
          status?: string;
          submitted_at?: string | null;
          user_id: string;
        };
        Update: {
          attempt_number?: number;
          graded_at?: string | null;
          id?: string;
          organization_id?: string;
          quiz_id?: string;
          score?: number | null;
          started_at?: string;
          status?: string;
          submitted_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_attempts_quiz_same_organization";
            columns: ["quiz_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      quiz_option_keys: {
        Row: {
          is_correct: boolean;
          option_id: string;
          organization_id: string;
        };
        Insert: {
          is_correct?: boolean;
          option_id: string;
          organization_id: string;
        };
        Update: {
          is_correct?: boolean;
          option_id?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_option_keys_option_id_fkey";
            columns: ["option_id"];
            isOneToOne: true;
            referencedRelation: "quiz_options";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_option_keys_option_same_organization";
            columns: ["option_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "quiz_options";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "quiz_option_keys_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_options: {
        Row: {
          id: string;
          label: string;
          order_index: number;
          organization_id: string;
          question_id: string;
        };
        Insert: {
          id?: string;
          label: string;
          order_index?: number;
          organization_id: string;
          question_id: string;
        };
        Update: {
          id?: string;
          label?: string;
          order_index?: number;
          organization_id?: string;
          question_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_options_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_options_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "quiz_questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_options_question_same_organization";
            columns: ["question_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "quiz_questions";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      quiz_questions: {
        Row: {
          explanation: string | null;
          id: string;
          order_index: number;
          organization_id: string;
          points: number;
          prompt: string;
          question_type: string;
          quiz_id: string;
        };
        Insert: {
          explanation?: string | null;
          id?: string;
          order_index?: number;
          organization_id: string;
          points?: number;
          prompt: string;
          question_type?: string;
          quiz_id: string;
        };
        Update: {
          explanation?: string | null;
          id?: string;
          order_index?: number;
          organization_id?: string;
          points?: number;
          prompt?: string;
          question_type?: string;
          quiz_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_questions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_questions_quiz_same_organization";
            columns: ["quiz_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      quiz_results: {
        Row: {
          completed_at: string;
          id: string;
          lesson_id: string | null;
          organization_id: string | null;
          score: number | null;
          user_id: string | null;
        };
        Insert: {
          completed_at?: string;
          id?: string;
          lesson_id?: string | null;
          organization_id?: string | null;
          score?: number | null;
          user_id?: string | null;
        };
        Update: {
          completed_at?: string;
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
            foreignKeyName: "quiz_results_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
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
      quizzes: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          lesson_id: string;
          max_attempts: number | null;
          organization_id: string;
          passing_score: number;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          lesson_id: string;
          max_attempts?: number | null;
          organization_id: string;
          passing_score?: number;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          lesson_id?: string;
          max_attempts?: number | null;
          organization_id?: string;
          passing_score?: number;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quizzes_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quizzes_lesson_same_organization";
            columns: ["lesson_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "quizzes_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      regularity_score: {
        Row: {
          level: string | null;
          organization_id: string | null;
          score: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          level?: string | null;
          organization_id?: string | null;
          score?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          level?: string | null;
          organization_id?: string | null;
          score?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "regularity_score_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "regularity_score_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      subjects: {
        Row: {
          color: string | null;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          order_index: number;
          organization_id: string;
          slug: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          order_index?: number;
          organization_id: string;
          slug: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          order_index?: number;
          organization_id?: string;
          slug?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subjects_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      submit_quiz_attempt: {
        Args: { p_answers: Json; p_quiz_id: string };
        Returns: {
          attempt_id: string;
          score: number;
        }[];
      };
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
