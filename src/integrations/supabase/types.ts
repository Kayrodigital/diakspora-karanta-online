export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      assessment_competencies: {
        Row: {
          assessment_id: string;
          competency_id: string;
          organization_id: string;
          weight: number;
        };
        Insert: {
          assessment_id: string;
          competency_id: string;
          organization_id: string;
          weight?: number;
        };
        Update: {
          assessment_id?: string;
          competency_id?: string;
          organization_id?: string;
          weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_competencies_assessment_id_organization_id_fkey";
            columns: ["assessment_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "assessment_competencies_competency_id_organization_id_fkey";
            columns: ["competency_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "competencies";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "assessment_competencies_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      assessment_periods: {
        Row: {
          created_at: string;
          ends_on: string;
          id: string;
          name: string;
          organization_id: string;
          starts_on: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          ends_on: string;
          id?: string;
          name: string;
          organization_id: string;
          starts_on: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          ends_on?: string;
          id?: string;
          name?: string;
          organization_id?: string;
          starts_on?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_periods_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      assessment_results: {
        Row: {
          assessment_id: string;
          created_at: string;
          evaluated_at: string | null;
          evaluated_by: string | null;
          id: string;
          learner_id: string;
          mastery_level: string;
          organization_id: string;
          published_at: string | null;
          raw_score: number | null;
          score_percent: number | null;
          status: string;
          teacher_feedback: string | null;
          updated_at: string;
        };
        Insert: {
          assessment_id: string;
          created_at?: string;
          evaluated_at?: string | null;
          evaluated_by?: string | null;
          id?: string;
          learner_id: string;
          mastery_level?: string;
          organization_id: string;
          published_at?: string | null;
          raw_score?: number | null;
          score_percent?: number | null;
          status?: string;
          teacher_feedback?: string | null;
          updated_at?: string;
        };
        Update: {
          assessment_id?: string;
          created_at?: string;
          evaluated_at?: string | null;
          evaluated_by?: string | null;
          id?: string;
          learner_id?: string;
          mastery_level?: string;
          organization_id?: string;
          published_at?: string | null;
          raw_score?: number | null;
          score_percent?: number | null;
          status?: string;
          teacher_feedback?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_results_assessment_id_organization_id_fkey";
            columns: ["assessment_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "assessment_results_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "learner_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessment_results_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      assessments: {
        Row: {
          assessment_type: string;
          cohort_id: string;
          course_id: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          evidence_type: string;
          id: string;
          lesson_id: string | null;
          max_score: number;
          organization_id: string;
          passing_score: number;
          period_id: string | null;
          scheduled_on: string | null;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          assessment_type?: string;
          cohort_id: string;
          course_id?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          evidence_type?: string;
          id?: string;
          lesson_id?: string | null;
          max_score?: number;
          organization_id: string;
          passing_score?: number;
          period_id?: string | null;
          scheduled_on?: string | null;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          assessment_type?: string;
          cohort_id?: string;
          course_id?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          evidence_type?: string;
          id?: string;
          lesson_id?: string | null;
          max_score?: number;
          organization_id?: string;
          passing_score?: number;
          period_id?: string | null;
          scheduled_on?: string | null;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessments_cohort_id_organization_id_fkey";
            columns: ["cohort_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "assessments_course_id_organization_id_fkey";
            columns: ["course_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "assessments_lesson_id_organization_id_fkey";
            columns: ["lesson_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "assessments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessments_period_id_organization_id_fkey";
            columns: ["period_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "assessment_periods";
            referencedColumns: ["id", "organization_id"];
          },
        ];
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
          audience: string | null;
          code: string | null;
          created_at: string;
          delivery_format: string | null;
          description: string | null;
          ends_on: string | null;
          enrollment_status: string;
          id: string;
          is_public: boolean;
          level: string | null;
          max_students: number | null;
          name: string;
          objective: string | null;
          organization_id: string;
          price_cents: number | null;
          program_level_id: string | null;
          public_summary: string | null;
          schedule_label: string | null;
          session_period: string | null;
          starts_on: string | null;
          status: string;
          teaching_languages: string[];
          teacher_id: string | null;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          audience?: string | null;
          code?: string | null;
          created_at?: string;
          delivery_format?: string | null;
          description?: string | null;
          ends_on?: string | null;
          enrollment_status?: string;
          id?: string;
          is_public?: boolean;
          level?: string | null;
          max_students?: number | null;
          name: string;
          objective?: string | null;
          organization_id: string;
          price_cents?: number | null;
          program_level_id?: string | null;
          public_summary?: string | null;
          schedule_label?: string | null;
          session_period?: string | null;
          starts_on?: string | null;
          status?: string;
          teaching_languages?: string[];
          teacher_id?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          audience?: string | null;
          code?: string | null;
          created_at?: string;
          delivery_format?: string | null;
          description?: string | null;
          ends_on?: string | null;
          enrollment_status?: string;
          id?: string;
          is_public?: boolean;
          level?: string | null;
          max_students?: number | null;
          name?: string;
          objective?: string | null;
          organization_id?: string;
          price_cents?: number | null;
          program_level_id?: string | null;
          public_summary?: string | null;
          schedule_label?: string | null;
          session_period?: string | null;
          starts_on?: string | null;
          status?: string;
          teaching_languages?: string[];
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
            foreignKeyName: "cohorts_program_level_id_fkey";
            columns: ["program_level_id"];
            isOneToOne: false;
            referencedRelation: "program_levels";
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
      competencies: {
        Row: {
          code: string | null;
          created_at: string;
          description: string | null;
          id: string;
          is_essential: boolean;
          level_id: string;
          name: string;
          order_index: number;
          organization_id: string;
          status: string;
          success_criteria: string | null;
          updated_at: string;
        };
        Insert: {
          code?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_essential?: boolean;
          level_id: string;
          name: string;
          order_index?: number;
          organization_id: string;
          status?: string;
          success_criteria?: string | null;
          updated_at?: string;
        };
        Update: {
          code?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_essential?: boolean;
          level_id?: string;
          name?: string;
          order_index?: number;
          organization_id?: string;
          status?: string;
          success_criteria?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "competencies_level_id_organization_id_fkey";
            columns: ["level_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "program_levels";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "competencies_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      competency_evidence: {
        Row: {
          competency_id: string;
          created_at: string;
          feedback: string | null;
          id: string;
          mastery_level: string;
          organization_id: string;
          result_id: string;
          score_percent: number | null;
          updated_at: string;
        };
        Insert: {
          competency_id: string;
          created_at?: string;
          feedback?: string | null;
          id?: string;
          mastery_level: string;
          organization_id: string;
          result_id: string;
          score_percent?: number | null;
          updated_at?: string;
        };
        Update: {
          competency_id?: string;
          created_at?: string;
          feedback?: string | null;
          id?: string;
          mastery_level?: string;
          organization_id?: string;
          result_id?: string;
          score_percent?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "competency_evidence_competency_id_organization_id_fkey";
            columns: ["competency_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "competencies";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "competency_evidence_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "competency_evidence_result_id_organization_id_fkey";
            columns: ["result_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "assessment_results";
            referencedColumns: ["id", "organization_id"];
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
          duration_seconds: number | null;
          feedback_at: string | null;
          feedback_by: string | null;
          feedback_text: string | null;
          external_url: string | null;
          file_url: string | null;
          id: string;
          lesson_id: string | null;
          notes: string | null;
          organization_id: string;
          status: string;
          type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          duration_seconds?: number | null;
          feedback_at?: string | null;
          feedback_by?: string | null;
          feedback_text?: string | null;
          external_url?: string | null;
          file_url?: string | null;
          id?: string;
          lesson_id?: string | null;
          notes?: string | null;
          organization_id: string;
          status?: string;
          type?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          duration_seconds?: number | null;
          feedback_at?: string | null;
          feedback_by?: string | null;
          feedback_text?: string | null;
          external_url?: string | null;
          file_url?: string | null;
          id?: string;
          lesson_id?: string | null;
          notes?: string | null;
          organization_id?: string;
          status?: string;
          type?: string;
          updated_at?: string;
          user_id?: string;
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
      learner_cohort_memberships: {
        Row: {
          cohort_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          joined_at: string;
          learner_id: string;
          organization_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          cohort_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          joined_at?: string;
          learner_id: string;
          organization_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          cohort_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          joined_at?: string;
          learner_id?: string;
          organization_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learner_cohort_memberships_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learner_cohort_memberships_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "learner_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learner_cohort_memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      learner_profiles: {
        Row: {
          access_mode: string;
          birth_date: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          full_name: string;
          guardian_user_id: string | null;
          id: string;
          organization_id: string;
          phone: string | null;
          preferred_name: string | null;
          status: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          access_mode?: string;
          birth_date?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          full_name: string;
          guardian_user_id?: string | null;
          id?: string;
          organization_id: string;
          phone?: string | null;
          preferred_name?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          access_mode?: string;
          birth_date?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          full_name?: string;
          guardian_user_id?: string | null;
          id?: string;
          organization_id?: string;
          phone?: string | null;
          preferred_name?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "learner_profiles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      learner_self_assessments: {
        Row: {
          assessed_at: string;
          competency_id: string;
          confidence: string;
          id: string;
          learner_id: string;
          note: string | null;
          organization_id: string;
        };
        Insert: {
          assessed_at?: string;
          competency_id: string;
          confidence: string;
          id?: string;
          learner_id: string;
          note?: string | null;
          organization_id: string;
        };
        Update: {
          assessed_at?: string;
          competency_id?: string;
          confidence?: string;
          id?: string;
          learner_id?: string;
          note?: string | null;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learner_self_assessments_competency_id_organization_id_fkey";
            columns: ["competency_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "competencies";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "learner_self_assessments_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "learner_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learner_self_assessments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_programs: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
          slug: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          slug: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          slug?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_programs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_competencies: {
        Row: {
          competency_id: string;
          lesson_id: string;
          organization_id: string;
          weight: number;
        };
        Insert: {
          competency_id: string;
          lesson_id: string;
          organization_id: string;
          weight?: number;
        };
        Update: {
          competency_id?: string;
          lesson_id?: string;
          organization_id?: string;
          weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_competencies_competency_id_organization_id_fkey";
            columns: ["competency_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "competencies";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "lesson_competencies_lesson_id_organization_id_fkey";
            columns: ["lesson_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "lesson_competencies_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
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
      lesson_notes: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          lesson_id: string;
          organization_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          body?: string;
          created_at?: string;
          id?: string;
          lesson_id: string;
          organization_id: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          lesson_id?: string;
          organization_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_notes_lesson_id_organization_id_fkey";
            columns: ["lesson_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "lesson_notes_organization_id_fkey";
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
      live_session_email_deliveries: {
        Row: {
          attempts: number;
          created_at: string;
          id: string;
          kind: string;
          last_error: string | null;
          live_session_id: string;
          next_attempt_at: string | null;
          organization_id: string;
          provider_message_id: string | null;
          recipient_email: string;
          recipient_name: string | null;
          recipient_user_id: string | null;
          revision: number;
          scheduled_for: string;
          sent_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          id?: string;
          kind: string;
          last_error?: string | null;
          live_session_id: string;
          next_attempt_at?: string | null;
          organization_id: string;
          provider_message_id?: string | null;
          recipient_email: string;
          recipient_name?: string | null;
          recipient_user_id?: string | null;
          revision?: number;
          scheduled_for?: string;
          sent_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          id?: string;
          kind?: string;
          last_error?: string | null;
          live_session_id?: string;
          next_attempt_at?: string | null;
          organization_id?: string;
          provider_message_id?: string | null;
          recipient_email?: string;
          recipient_name?: string | null;
          recipient_user_id?: string | null;
          revision?: number;
          scheduled_for?: string;
          sent_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "live_session_email_deliveries_live_session_id_fkey";
            columns: ["live_session_id"];
            isOneToOne: false;
            referencedRelation: "live_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "live_session_email_deliveries_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "live_session_email_deliveries_recipient_user_id_fkey";
            columns: ["recipient_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
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
          notification_revision: number;
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
          notification_revision?: number;
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
          notification_revision?: number;
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
      organization_invitations: {
        Row: {
          accepted_at: string | null;
          cohort_id: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          full_name: string;
          id: string;
          invited_by: string;
          organization_id: string;
          role: string;
          status: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          accepted_at?: string | null;
          cohort_id?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          full_name: string;
          id?: string;
          invited_by: string;
          organization_id: string;
          role: string;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          cohort_id?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          full_name?: string;
          id?: string;
          invited_by?: string;
          organization_id?: string;
          role?: string;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "organization_invitations_cohort_id_fkey";
            columns: ["cohort_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_invitations_organization_id_fkey";
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
      pedagogical_conversations: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          last_message_at: string;
          learner_id: string;
          organization_id: string;
          status: string;
          subject: string;
          teacher_user_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          id?: string;
          last_message_at?: string;
          learner_id: string;
          organization_id: string;
          status?: string;
          subject: string;
          teacher_user_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          last_message_at?: string;
          learner_id?: string;
          organization_id?: string;
          status?: string;
          subject?: string;
          teacher_user_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pedagogical_conversations_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "learner_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedagogical_conversations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      pedagogical_messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          id: string;
          organization_id: string;
          sender_user_id: string;
        };
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          organization_id: string;
          sender_user_id?: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          organization_id?: string;
          sender_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pedagogical_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "pedagogical_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pedagogical_messages_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
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
          email: string | null;
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
          email?: string | null;
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
          email?: string | null;
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
      program_levels: {
        Row: {
          code: string | null;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          order_index: number;
          organization_id: string;
          program_id: string;
          required_mastery_percent: number;
          status: string;
          updated_at: string;
        };
        Insert: {
          code?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          order_index?: number;
          organization_id: string;
          program_id: string;
          required_mastery_percent?: number;
          status?: string;
          updated_at?: string;
        };
        Update: {
          code?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          order_index?: number;
          organization_id?: string;
          program_id?: string;
          required_mastery_percent?: number;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "program_levels_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "program_levels_program_id_organization_id_fkey";
            columns: ["program_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "learning_programs";
            referencedColumns: ["id", "organization_id"];
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
            foreignKeyName: "progress_lesson_same_organization";
            columns: ["lesson_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id", "organization_id"];
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
      report_card_items: {
        Row: {
          comment: string | null;
          competency_id: string;
          id: string;
          mastery_level: string;
          organization_id: string;
          report_card_id: string;
        };
        Insert: {
          comment?: string | null;
          competency_id: string;
          id?: string;
          mastery_level: string;
          organization_id: string;
          report_card_id: string;
        };
        Update: {
          comment?: string | null;
          competency_id?: string;
          id?: string;
          mastery_level?: string;
          organization_id?: string;
          report_card_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_card_items_competency_id_organization_id_fkey";
            columns: ["competency_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "competencies";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "report_card_items_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_card_items_report_card_id_organization_id_fkey";
            columns: ["report_card_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "report_cards";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      report_cards: {
        Row: {
          attendance_percent: number | null;
          cohort_id: string;
          created_at: string;
          created_by: string;
          decision: string;
          id: string;
          learner_id: string;
          mastery_percent: number | null;
          organization_id: string;
          overall_score: number | null;
          period_id: string | null;
          priorities: string | null;
          published_at: string | null;
          status: string;
          strengths: string | null;
          teacher_comment: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          attendance_percent?: number | null;
          cohort_id: string;
          created_at?: string;
          created_by: string;
          decision?: string;
          id?: string;
          learner_id: string;
          mastery_percent?: number | null;
          organization_id: string;
          overall_score?: number | null;
          period_id?: string | null;
          priorities?: string | null;
          published_at?: string | null;
          status?: string;
          strengths?: string | null;
          teacher_comment?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          attendance_percent?: number | null;
          cohort_id?: string;
          created_at?: string;
          created_by?: string;
          decision?: string;
          id?: string;
          learner_id?: string;
          mastery_percent?: number | null;
          organization_id?: string;
          overall_score?: number | null;
          period_id?: string | null;
          priorities?: string | null;
          published_at?: string | null;
          status?: string;
          strengths?: string | null;
          teacher_comment?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_cards_cohort_id_organization_id_fkey";
            columns: ["cohort_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "cohorts";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "report_cards_learner_id_fkey";
            columns: ["learner_id"];
            isOneToOne: false;
            referencedRelation: "learner_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_cards_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_cards_period_id_organization_id_fkey";
            columns: ["period_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "assessment_periods";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      shop_order_items: {
        Row: {
          cover_url: string | null;
          created_at: string;
          id: string;
          line_total_cents: number | null;
          order_id: string;
          organization_id: string;
          product_id: string | null;
          product_sku: string | null;
          product_title: string;
          quantity: number;
          unit_price_cents: number;
        };
        Insert: {
          cover_url?: string | null;
          created_at?: string;
          id?: string;
          line_total_cents?: number | null;
          order_id: string;
          organization_id: string;
          product_id?: string | null;
          product_sku?: string | null;
          product_title: string;
          quantity: number;
          unit_price_cents: number;
        };
        Update: {
          cover_url?: string | null;
          created_at?: string;
          id?: string;
          line_total_cents?: number | null;
          order_id?: string;
          organization_id?: string;
          product_id?: string | null;
          product_sku?: string | null;
          product_title?: string;
          quantity?: number;
          unit_price_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "shop_order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "shop_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_order_items_order_tenant";
            columns: ["order_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "shop_orders";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "shop_order_items_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "shop_products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_order_items_product_tenant";
            columns: ["product_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "shop_products";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      shop_orders: {
        Row: {
          created_at: string;
          currency: string;
          customer_email: string;
          customer_name: string;
          customer_phone: string | null;
          delivered_at: string | null;
          expires_at: string;
          id: string;
          internal_notes: string | null;
          order_number: string;
          organization_id: string;
          paid_at: string | null;
          shipped_at: string | null;
          shipping_address: Json | null;
          shipping_cents: number;
          shop_id: string;
          status: string;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          subtotal_cents: number;
          total_cents: number;
          tracking_reference: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          customer_email: string;
          customer_name: string;
          customer_phone?: string | null;
          delivered_at?: string | null;
          expires_at?: string;
          id?: string;
          internal_notes?: string | null;
          order_number?: string;
          organization_id: string;
          paid_at?: string | null;
          shipped_at?: string | null;
          shipping_address?: Json | null;
          shipping_cents?: number;
          shop_id: string;
          status?: string;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          subtotal_cents?: number;
          total_cents?: number;
          tracking_reference?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          currency?: string;
          customer_email?: string;
          customer_name?: string;
          customer_phone?: string | null;
          delivered_at?: string | null;
          expires_at?: string;
          id?: string;
          internal_notes?: string | null;
          order_number?: string;
          organization_id?: string;
          paid_at?: string | null;
          shipped_at?: string | null;
          shipping_address?: Json | null;
          shipping_cents?: number;
          shop_id?: string;
          status?: string;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          subtotal_cents?: number;
          total_cents?: number;
          tracking_reference?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "shop_orders_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_orders_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shop_settings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_orders_tenant_consistency";
            columns: ["shop_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "shop_settings";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      shop_products: {
        Row: {
          author: string | null;
          book_id: string | null;
          compare_at_price_cents: number | null;
          cover_url: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          featured: boolean;
          format: string;
          id: string;
          language: string;
          low_stock_threshold: number;
          organization_id: string;
          price_cents: number;
          published_at: string | null;
          shop_id: string;
          sku: string | null;
          slug: string;
          status: string;
          stock_quantity: number;
          subtitle: string | null;
          title: string;
          track_inventory: boolean;
          updated_at: string;
        };
        Insert: {
          author?: string | null;
          book_id?: string | null;
          compare_at_price_cents?: number | null;
          cover_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          featured?: boolean;
          format?: string;
          id?: string;
          language?: string;
          low_stock_threshold?: number;
          organization_id: string;
          price_cents: number;
          published_at?: string | null;
          shop_id: string;
          sku?: string | null;
          slug: string;
          status?: string;
          stock_quantity?: number;
          subtitle?: string | null;
          title: string;
          track_inventory?: boolean;
          updated_at?: string;
        };
        Update: {
          author?: string | null;
          book_id?: string | null;
          compare_at_price_cents?: number | null;
          cover_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          featured?: boolean;
          format?: string;
          id?: string;
          language?: string;
          low_stock_threshold?: number;
          organization_id?: string;
          price_cents?: number;
          published_at?: string | null;
          shop_id?: string;
          sku?: string | null;
          slug?: string;
          status?: string;
          stock_quantity?: number;
          subtitle?: string | null;
          title?: string;
          track_inventory?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shop_products_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_products_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_products_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shop_settings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_products_tenant_consistency";
            columns: ["shop_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "shop_settings";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      shop_settings: {
        Row: {
          created_at: string;
          currency: string;
          description: string | null;
          flat_shipping_cents: number;
          free_shipping_threshold_cents: number | null;
          id: string;
          name: string;
          organization_id: string;
          payment_enabled: boolean;
          payment_provider: string;
          shipping_country: string;
          slug: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          description?: string | null;
          flat_shipping_cents?: number;
          free_shipping_threshold_cents?: number | null;
          id?: string;
          name: string;
          organization_id: string;
          payment_enabled?: boolean;
          payment_provider?: string;
          shipping_country?: string;
          slug: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          description?: string | null;
          flat_shipping_cents?: number;
          free_shipping_threshold_cents?: number | null;
          id?: string;
          name?: string;
          organization_id?: string;
          payment_enabled?: boolean;
          payment_provider?: string;
          shipping_country?: string;
          slug?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shop_settings_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      shop_webhook_events: {
        Row: {
          created_at: string;
          event_id: string;
          event_type: string;
          last_error: string | null;
          processed_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          event_type: string;
          last_error?: string | null;
          processed_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          event_type?: string;
          last_error?: string | null;
          processed_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
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
      support_messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          organization_id: string;
          sender_user_id: string;
          ticket_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          organization_id: string;
          sender_user_id?: string;
          ticket_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          organization_id?: string;
          sender_user_id?: string;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_messages_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "support_tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      support_tickets: {
        Row: {
          assigned_to: string | null;
          category: string;
          created_at: string;
          id: string;
          last_message_at: string;
          organization_id: string;
          priority: string;
          requester_user_id: string;
          status: string;
          subject: string;
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          last_message_at?: string;
          organization_id: string;
          priority?: string;
          requester_user_id?: string;
          status?: string;
          subject: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          last_message_at?: string;
          organization_id?: string;
          priority?: string;
          requester_user_id?: string;
          status?: string;
          subject?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_tickets_organization_id_fkey";
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
      accept_my_organization_invitations: { Args: never; Returns: number };
      check_shop_checkout_rate_limit: {
        Args: { p_fingerprint: string };
        Returns: boolean;
      };
      claim_due_live_email_notifications: {
        Args: { p_limit?: number };
        Returns: {
          attempt: number;
          cohort_name: string;
          course_title: string;
          delivery_id: string;
          description: string;
          ends_at: string;
          join_url: string;
          kind: string;
          live_session_id: string;
          organization_id: string;
          organization_name: string;
          provider: string;
          recipient_email: string;
          recipient_name: string;
          replay_url: string;
          starts_at: string;
          timezone: string;
          title: string;
        }[];
      };
      create_shop_order: {
        Args: {
          p_customer_email: string;
          p_customer_name: string;
          p_customer_phone: string;
          p_items: Json;
          p_shop_id: string;
          p_user_id?: string;
        };
        Returns: Json;
      };
      list_public_cohorts: {
        Args: { p_organization_slug?: string };
        Returns: {
          audience: string;
          availability: string;
          delivery_format: string;
          id: string;
          level: string;
          name: string;
          objective: string;
          price_cents: number | null;
          public_summary: string | null;
          remaining_places: number | null;
          schedule_label: string;
          session_period: string;
          starts_on: string | null;
          teaching_languages: string[];
          timezone: string;
        }[];
      };
      mark_shop_order_paid: {
        Args: {
          p_checkout_session_id: string;
          p_order_id: string;
          p_payment_intent_id: string;
          p_shipping_address?: Json;
        };
        Returns: boolean;
      };
      release_shop_order: {
        Args: { p_order_id: string; p_status?: string };
        Returns: boolean;
      };
      submit_enrollment_application: {
        Args: {
          p_accompaniment_language: string;
          p_applicant_name: string;
          p_audience: string;
          p_availability: string;
          p_cohort_id: string | null;
          p_email: string;
          p_learner_name: string | null;
          p_level: string;
          p_notes: string | null;
          p_objective: string;
          p_organization_slug: string;
          p_phone: string;
          p_preferred_contact: string;
          p_privacy_consent: boolean;
          p_website?: string | null;
        };
        Returns: string;
      };
      submit_quiz_attempt: {
        Args: { p_answers: Json; p_quiz_id: string };
        Returns: {
          attempt_id: string;
          score: number;
        }[];
      };
      update_shop_order_fulfillment: {
        Args: {
          p_internal_notes?: string;
          p_order_id: string;
          p_status: string;
          p_tracking_reference?: string;
        };
        Returns: {
          created_at: string;
          currency: string;
          customer_email: string;
          customer_name: string;
          customer_phone: string | null;
          delivered_at: string | null;
          expires_at: string;
          id: string;
          internal_notes: string | null;
          order_number: string;
          organization_id: string;
          paid_at: string | null;
          shipped_at: string | null;
          shipping_address: Json | null;
          shipping_cents: number;
          shop_id: string;
          status: string;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          subtotal_cents: number;
          total_cents: number;
          tracking_reference: string | null;
          updated_at: string;
          user_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "shop_orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      verify_live_notification_cron_secret: {
        Args: { p_secret: string };
        Returns: boolean;
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
