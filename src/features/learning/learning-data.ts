import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { loadPortalAccess } from "@/lib/auth/portal-access";
import type { SessionProgress } from "./progress-data";

export type LearningSubject = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  order_index: number;
};

export type LearningBook = {
  id: string;
  subject_id: string | null;
  title: string;
  subtitle: string | null;
  author: string | null;
  description: string | null;
  cover_url: string | null;
  level: string | null;
};

export type LearningChapter = {
  id: string;
  book_id: string;
  title: string;
  description: string | null;
  order_index: number;
};

export type LearningLesson = {
  id: string;
  chapter_id: string | null;
  title: string;
  summary: string | null;
  duration_minutes: number | null;
  order_index: number | null;
  is_preview: boolean;
};

export type LearningSession = {
  id: string;
  organization_id: string;
  lesson_id: string;
  title: string;
  summary: string | null;
  duration_minutes: number | null;
  order_index: number;
  access_tier: "free" | "premium" | null;
  requires_validation: boolean;
};

export type LearningCatalog = {
  enabled: boolean;
  progressEnabled: boolean;
  activeProfileId: string | null;
  subjects: LearningSubject[];
  books: LearningBook[];
  chapters: LearningChapter[];
  lessons: LearningLesson[];
  sessions: LearningSession[];
  progress: SessionProgress[];
};

function flagIsEnabled(flags: Json): boolean {
  return Boolean(
    flags && typeof flags === "object" && !Array.isArray(flags) && flags.pedagogy_v1 === true,
  );
}

function progressFlagIsEnabled(flags: Json): boolean {
  return Boolean(
    flags && typeof flags === "object" && !Array.isArray(flags) && flags.progress_v1 === true,
  );
}

export async function loadLearningCatalog(profileId?: string): Promise<LearningCatalog> {
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("feature_flags")
    .eq("slug", "diakspora")
    .maybeSingle();

  if (organizationError) throw organizationError;

  const enabled = flagIsEnabled(organization?.feature_flags ?? null);
  const progressEnabled = progressFlagIsEnabled(organization?.feature_flags ?? null);
  if (!enabled) {
    return {
      enabled,
      progressEnabled,
      activeProfileId: null,
      subjects: [],
      books: [],
      chapters: [],
      lessons: [],
      sessions: [],
      progress: [],
    };
  }

  const [subjectsResult, booksResult, chaptersResult, lessonsResult, sessionsResult, access] =
    await Promise.all([
      supabase
        .from("subjects")
        .select("id, name, slug, description, color, order_index")
        .eq("status", "published")
        .order("order_index"),
      supabase
        .from("books")
        .select("id, subject_id, title, subtitle, author, description, cover_url, level")
        .eq("status", "published")
        .order("created_at"),
      supabase
        .from("chapters")
        .select("id, book_id, title, description, order_index")
        .eq("status", "published")
        .order("order_index"),
      supabase
        .from("lessons")
        .select("id, chapter_id, title, summary, duration_minutes, order_index, is_preview")
        .eq("status", "published")
        .order("order_index"),
      supabase
        .from("sessions")
        .select(
          "id, organization_id, lesson_id, title, summary, duration_minutes, order_index, access_tier, requires_validation",
        )
        .eq("status", "published")
        .order("order_index"),
      profileId ? Promise.resolve(null) : loadPortalAccess("family"),
    ]);

  const firstError = [
    subjectsResult.error,
    booksResult.error,
    chaptersResult.error,
    lessonsResult.error,
    sessionsResult.error,
  ].find(Boolean);
  if (firstError) throw firstError;

  const activeProfileId = profileId ?? access?.activeProfileId ?? null;
  const progressResult =
    progressEnabled && activeProfileId
      ? await supabase
          .from("profile_session_progress")
          .select("*")
          .eq("profile_id", activeProfileId)
          .order("updated_at", { ascending: false })
      : { data: [], error: null };
  if (progressResult.error) throw progressResult.error;

  return {
    enabled,
    progressEnabled,
    activeProfileId,
    subjects: (subjectsResult.data ?? []) as LearningSubject[],
    books: (booksResult.data ?? []) as LearningBook[],
    chapters: (chaptersResult.data ?? []) as LearningChapter[],
    lessons: (lessonsResult.data ?? []) as LearningLesson[],
    sessions: (sessionsResult.data ?? []) as LearningSession[],
    progress: (progressResult.data ?? []) as SessionProgress[],
  };
}
