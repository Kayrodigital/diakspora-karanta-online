import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  createLiveSession,
  updateLiveSession,
  type LiveSessionUpdate,
} from "@/features/live/live-data";

type PublicTables = Database["public"]["Tables"];
type Row<Table extends keyof PublicTables> = PublicTables[Table]["Row"];

export type Course = Row<"courses">;
export type Cohort = Row<"cohorts">;
export type Book = Row<"books">;
export type Subject = Row<"subjects">;
export type LiveSession = Row<"live_sessions">;

export type PedagogicalDashboard = {
  courses: Course[];
  cohorts: Cohort[];
  books: Book[];
  subjects: Subject[];
  liveSessions: LiveSession[];
};

export type LearningItemInput =
  | {
      kind: "course";
      title: string;
      description?: string;
      level?: string;
      language: string;
      accessScope: "organization" | "cohort" | "invite";
      subjectId?: string;
      bookId?: string;
    }
  | {
      kind: "cohort";
      name: string;
      code?: string;
      description?: string;
      level?: string;
      maxStudents?: number;
    }
  | {
      kind: "book";
      title: string;
      author?: string;
      description?: string;
      level?: string;
      subjectId?: string;
    }
  | {
      kind: "subject";
      name: string;
      description?: string;
    }
  | {
      kind: "live";
      title: string;
      description?: string;
      provider: "zoom" | "google_meet" | "telegram" | "whatsapp" | "other";
      startsAt: string;
      durationMinutes: number;
      joinUrl?: string;
      courseId?: string;
      cohortId?: string;
    };

function humanSlug(value: string): string {
  const base = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 54);

  return `${base || "element"}-${Date.now().toString(36)}`;
}

function firstError(errors: Array<Error | null>): Error | null {
  return errors.find((error): error is Error => Boolean(error)) ?? null;
}

export async function loadPedagogicalDashboard(
  organizationId: string,
): Promise<PedagogicalDashboard> {
  const [courses, cohorts, books, subjects, liveSessions] = await Promise.all([
    supabase
      .from("courses")
      .select("*")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("cohorts")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("books")
      .select("*")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("subjects")
      .select("*")
      .eq("organization_id", organizationId)
      .order("order_index", { ascending: true }),
    supabase
      .from("live_sessions")
      .select("*")
      .eq("organization_id", organizationId)
      .order("starts_at", { ascending: true }),
  ]);

  const error = firstError([
    courses.error,
    cohorts.error,
    books.error,
    subjects.error,
    liveSessions.error,
  ]);

  if (error) throw error;

  return {
    courses: courses.data ?? [],
    cohorts: cohorts.data ?? [],
    books: books.data ?? [],
    subjects: subjects.data ?? [],
    liveSessions: liveSessions.data ?? [],
  };
}

export async function createLearningItem(
  organizationId: string,
  userId: string,
  input: LearningItemInput,
): Promise<void> {
  if (input.kind === "course") {
    const { error } = await supabase.from("courses").insert({
      organization_id: organizationId,
      created_by: userId,
      title: input.title,
      slug: humanSlug(input.title),
      description: input.description || null,
      level: input.level || null,
      language: input.language,
      access_scope: input.accessScope,
      subject_id: input.subjectId || null,
      book_id: input.bookId || null,
      status: "draft",
    });
    if (error) throw error;
    return;
  }

  if (input.kind === "cohort") {
    const { error } = await supabase.from("cohorts").insert({
      organization_id: organizationId,
      name: input.name,
      code: input.code || null,
      description: input.description || null,
      level: input.level || null,
      max_students: input.maxStudents || null,
      status: "active",
    });
    if (error) throw error;
    return;
  }

  if (input.kind === "book") {
    const { error } = await supabase.from("books").insert({
      organization_id: organizationId,
      created_by: userId,
      title: input.title,
      author: input.author || null,
      description: input.description || null,
      level: input.level || null,
      subject_id: input.subjectId || null,
      status: "draft",
    });
    if (error) throw error;
    return;
  }

  if (input.kind === "subject") {
    const { error } = await supabase.from("subjects").insert({
      organization_id: organizationId,
      name: input.name,
      slug: humanSlug(input.name),
      description: input.description || null,
      status: "active",
    });
    if (error) throw error;
    return;
  }

  await createLiveSession(organizationId, userId, input);
}

export async function updatePedagogicalLiveSession(
  organizationId: string,
  session: LiveSession,
  input: LiveSessionUpdate,
) {
  await updateLiveSession(organizationId, session, input);
}
