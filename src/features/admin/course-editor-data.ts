import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PublicTables = Database["public"]["Tables"];
type Row<Table extends keyof PublicTables> = PublicTables[Table]["Row"];

export type CourseModule = Row<"course_modules">;
export type CourseLesson = Row<"lessons">;
export type LessonResource = Row<"lesson_resources">;
export type CourseQuiz = Row<"quizzes">;
export type CourseCohort = Row<"cohorts">;

export type CourseEditorData = {
  course: Row<"courses">;
  modules: CourseModule[];
  lessons: CourseLesson[];
  resources: LessonResource[];
  quizzes: CourseQuiz[];
  cohorts: CourseCohort[];
  assignedCohortIds: string[];
};

type ResourceType = "audio" | "video" | "youtube" | "document" | "link" | "text" | "replay";

function firstError(errors: Array<Error | null>): Error | null {
  return errors.find((error): error is Error => Boolean(error)) ?? null;
}

export async function loadCourseEditor(
  organizationId: string,
  courseId: string,
): Promise<CourseEditorData> {
  const [course, modules, lessons, cohorts, assignments] = await Promise.all([
    supabase
      .from("courses")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", courseId)
      .maybeSingle(),
    supabase
      .from("course_modules")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("course_id", courseId)
      .order("order_index", { ascending: true }),
    supabase
      .from("lessons")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("course_id", courseId)
      .order("order_index", { ascending: true }),
    supabase
      .from("cohorts")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("name", { ascending: true }),
    supabase
      .from("course_cohorts")
      .select("cohort_id")
      .eq("organization_id", organizationId)
      .eq("course_id", courseId),
  ]);

  const primaryError = firstError([
    course.error,
    modules.error,
    lessons.error,
    cohorts.error,
    assignments.error,
  ]);
  if (primaryError) throw primaryError;
  if (!course.data) throw new Error("Ce cours est introuvable ou vous n'y avez pas accès.");

  const lessonIds = (lessons.data ?? []).map((lesson) => lesson.id);
  const [resources, quizzes] = lessonIds.length
    ? await Promise.all([
        supabase
          .from("lesson_resources")
          .select("*")
          .eq("organization_id", organizationId)
          .in("lesson_id", lessonIds)
          .order("order_index", { ascending: true }),
        supabase
          .from("quizzes")
          .select("*")
          .eq("organization_id", organizationId)
          .in("lesson_id", lessonIds)
          .order("created_at", { ascending: true }),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  const secondaryError = firstError([resources.error, quizzes.error]);
  if (secondaryError) throw secondaryError;

  return {
    course: course.data,
    modules: modules.data ?? [],
    lessons: lessons.data ?? [],
    resources: resources.data ?? [],
    quizzes: quizzes.data ?? [],
    cohorts: cohorts.data ?? [],
    assignedCohortIds: (assignments.data ?? []).map((assignment) => assignment.cohort_id),
  };
}

export async function createCourseModule(input: {
  organizationId: string;
  courseId: string;
  title: string;
  description?: string;
  orderIndex: number;
}): Promise<void> {
  const { error } = await supabase.from("course_modules").insert({
    organization_id: input.organizationId,
    course_id: input.courseId,
    title: input.title,
    description: input.description || null,
    order_index: input.orderIndex,
    status: "draft",
  });
  if (error) throw error;
}

export async function createCourseLesson(input: {
  organizationId: string;
  courseId: string;
  moduleId: string;
  userId: string;
  title: string;
  summary?: string;
  durationMinutes?: number;
  lessonType: "on_demand" | "live" | "hybrid";
  orderIndex: number;
}): Promise<void> {
  const { error } = await supabase.from("lessons").insert({
    organization_id: input.organizationId,
    course_id: input.courseId,
    module_id: input.moduleId,
    created_by: input.userId,
    title: input.title,
    summary: input.summary || null,
    duration_minutes: input.durationMinutes || null,
    lesson_type: input.lessonType,
    order_index: input.orderIndex,
    status: "draft",
  });
  if (error) throw error;
}

export async function addExternalResource(input: {
  organizationId: string;
  lessonId: string;
  userId: string;
  title: string;
  description?: string;
  resourceType: Exclude<ResourceType, "audio" | "document">;
  externalUrl?: string;
  transcript?: string;
  orderIndex: number;
}): Promise<void> {
  const { error } = await supabase.from("lesson_resources").insert({
    organization_id: input.organizationId,
    lesson_id: input.lessonId,
    created_by: input.userId,
    title: input.title,
    description: input.description || null,
    resource_type: input.resourceType,
    external_url: input.externalUrl || null,
    transcript: input.transcript || null,
    order_index: input.orderIndex,
    status: "active",
  });
  if (error) throw error;
}

function safeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(-100);
}

export async function uploadLessonResource(input: {
  organizationId: string;
  courseId: string;
  lessonId: string;
  userId: string;
  title: string;
  description?: string;
  file: File;
  orderIndex: number;
}): Promise<void> {
  const isAudio = input.file.type.startsWith("audio/");
  const isDocument = input.file.type === "application/pdf";
  const isVideo = input.file.type.startsWith("video/");
  if (!isAudio && !isDocument && !isVideo) {
    throw new Error("Format non accepté. Utilisez un fichier audio, une vidéo MP4/WebM ou un PDF.");
  }

  const fileName = safeFileName(input.file.name) || "ressource";
  const storagePath = `${input.organizationId}/${input.courseId}/${input.lessonId}/${Date.now()}-${fileName}`;
  const { error: uploadError } = await supabase.storage
    .from("course-media")
    .upload(storagePath, input.file, { contentType: input.file.type, upsert: false });
  if (uploadError) throw uploadError;

  const resourceType: ResourceType = isAudio ? "audio" : isVideo ? "video" : "document";
  const { error: resourceError } = await supabase.from("lesson_resources").insert({
    organization_id: input.organizationId,
    lesson_id: input.lessonId,
    created_by: input.userId,
    title: input.title,
    description: input.description || null,
    resource_type: resourceType,
    storage_path: storagePath,
    mime_type: input.file.type,
    file_size_bytes: input.file.size,
    order_index: input.orderIndex,
    status: "active",
  });

  if (resourceError) {
    await supabase.storage.from("course-media").remove([storagePath]);
    throw resourceError;
  }
}

export async function createBasicQuiz(input: {
  organizationId: string;
  lessonId: string;
  userId: string;
  title: string;
  prompt: string;
  explanation?: string;
  options: string[];
  correctIndex: number;
}): Promise<void> {
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .insert({
      organization_id: input.organizationId,
      lesson_id: input.lessonId,
      created_by: input.userId,
      title: input.title,
      passing_score: 70,
      status: "draft",
    })
    .select("id")
    .single();
  if (quizError) throw quizError;

  try {
    const { data: question, error: questionError } = await supabase
      .from("quiz_questions")
      .insert({
        organization_id: input.organizationId,
        quiz_id: quiz.id,
        prompt: input.prompt,
        explanation: input.explanation || null,
        question_type: "single_choice",
        order_index: 0,
      })
      .select("id")
      .single();
    if (questionError) throw questionError;

    const { data: options, error: optionsError } = await supabase
      .from("quiz_options")
      .insert(
        input.options.map((label, index) => ({
          organization_id: input.organizationId,
          question_id: question.id,
          label,
          order_index: index,
        })),
      )
      .select("id, order_index");
    if (optionsError) throw optionsError;

    const { error: keyError } = await supabase.from("quiz_option_keys").insert(
      options.map((option) => ({
        organization_id: input.organizationId,
        option_id: option.id,
        is_correct: option.order_index === input.correctIndex,
      })),
    );
    if (keyError) throw keyError;
  } catch (error) {
    await supabase.from("quizzes").delete().eq("id", quiz.id);
    throw error;
  }
}

export async function updateCourseSettings(input: {
  organizationId: string;
  courseId: string;
  title: string;
  description?: string;
  level?: string;
  accessScope: "organization" | "cohort" | "invite";
}): Promise<void> {
  const { error } = await supabase
    .from("courses")
    .update({
      title: input.title,
      description: input.description || null,
      level: input.level || null,
      access_scope: input.accessScope,
    })
    .eq("organization_id", input.organizationId)
    .eq("id", input.courseId);
  if (error) throw error;
}

export async function updateCoursePublication(input: {
  organizationId: string;
  courseId: string;
  published: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from("courses")
    .update({
      status: input.published ? "published" : "draft",
      published_at: input.published ? new Date().toISOString() : null,
    })
    .eq("organization_id", input.organizationId)
    .eq("id", input.courseId);
  if (error) throw error;
}

export async function updateLessonPublication(input: {
  organizationId: string;
  lessonId: string;
  published: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from("lessons")
    .update({ status: input.published ? "published" : "draft" })
    .eq("organization_id", input.organizationId)
    .eq("id", input.lessonId);
  if (error) throw error;
}

export async function setCourseCohorts(input: {
  organizationId: string;
  courseId: string;
  userId: string;
  previousIds: string[];
  nextIds: string[];
}): Promise<void> {
  const previous = new Set(input.previousIds);
  const next = new Set(input.nextIds);
  const removed = input.previousIds.filter((id) => !next.has(id));
  const added = input.nextIds.filter((id) => !previous.has(id));

  const operations: Array<PromiseLike<{ error: Error | null }>> = [];
  if (removed.length) {
    operations.push(
      supabase
        .from("course_cohorts")
        .delete()
        .eq("organization_id", input.organizationId)
        .eq("course_id", input.courseId)
        .in("cohort_id", removed),
    );
  }
  if (added.length) {
    operations.push(
      supabase.from("course_cohorts").insert(
        added.map((cohortId) => ({
          organization_id: input.organizationId,
          course_id: input.courseId,
          cohort_id: cohortId,
          assigned_by: input.userId,
        })),
      ),
    );
  }

  const results = await Promise.all(operations);
  const error = firstError(results.map((result) => result.error));
  if (error) throw error;
}
