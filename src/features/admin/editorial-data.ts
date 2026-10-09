import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type EditorialBook = Tables["books"]["Row"];
export type EditorialChapter = Tables["chapters"]["Row"];
export type EditorialLesson = Tables["lessons"]["Row"];
export type EditorialSession = Tables["sessions"]["Row"];

export type EditorialCatalog = {
  books: EditorialBook[];
  chapters: EditorialChapter[];
  lessons: EditorialLesson[];
  sessions: EditorialSession[];
};

export type EditorialStatus = "draft" | "published" | "archived";

function firstError(errors: Array<Error | null>): Error | null {
  return errors.find((error): error is Error => Boolean(error)) ?? null;
}

export function stringList(value: Json): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function loadEditorialCatalog(organizationId: string): Promise<EditorialCatalog> {
  const [books, chapters, lessons, sessions] = await Promise.all([
    supabase.from("books").select("*").eq("organization_id", organizationId).order("title"),
    supabase
      .from("chapters")
      .select("*")
      .eq("organization_id", organizationId)
      .order("order_index"),
    supabase.from("lessons").select("*").eq("organization_id", organizationId).order("order_index"),
    supabase
      .from("sessions")
      .select("*")
      .eq("organization_id", organizationId)
      .order("order_index"),
  ]);
  const error = firstError([books.error, chapters.error, lessons.error, sessions.error]);
  if (error) throw error;
  return {
    books: books.data ?? [],
    chapters: chapters.data ?? [],
    lessons: lessons.data ?? [],
    sessions: sessions.data ?? [],
  };
}

async function ensureUpdates(results: Array<{ error: Error | null }>): Promise<void> {
  const error = firstError(results.map((result) => result.error));
  if (error) throw error;
}

export async function saveEditorialOrder(
  kind: "chapters" | "lessons" | "sessions",
  orderedIds: string[],
): Promise<void> {
  if (kind === "chapters") {
    await ensureUpdates(
      await Promise.all(
        orderedIds.map((id, order_index) =>
          supabase.from("chapters").update({ order_index }).eq("id", id),
        ),
      ),
    );
    return;
  }
  if (kind === "lessons") {
    await ensureUpdates(
      await Promise.all(
        orderedIds.map((id, order_index) =>
          supabase.from("lessons").update({ order_index }).eq("id", id),
        ),
      ),
    );
    return;
  }
  await ensureUpdates(
    await Promise.all(
      orderedIds.map((id, order_index) =>
        supabase.from("sessions").update({ order_index }).eq("id", id),
      ),
    ),
  );
}

export async function updateEditorialSession(
  id: string,
  input: {
    title: string;
    summary: string | null;
    lesson_id: string;
    order_index: number;
    duration_minutes: number | null;
    status: EditorialStatus;
    learning_points: string[];
    reflection_questions: string[];
  },
): Promise<void> {
  const { error } = await supabase
    .from("sessions")
    .update({
      ...input,
      published_at: input.status === "published" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function updateEditorialLesson(
  id: string,
  input: {
    title: string;
    summary: string | null;
    chapter_id: string;
    order_index: number;
    status: EditorialStatus;
  },
): Promise<void> {
  const { error } = await supabase
    .from("lessons")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function updateEditorialChapter(
  id: string,
  input: {
    title: string;
    description: string | null;
    order_index: number;
    status: EditorialStatus;
  },
): Promise<void> {
  const { error } = await supabase
    .from("chapters")
    .update({
      ...input,
      published_at: input.status === "published" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}
