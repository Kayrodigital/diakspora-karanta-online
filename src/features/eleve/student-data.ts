import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

type PublicTables = Database["public"]["Tables"];
type Row<Table extends keyof PublicTables> = PublicTables[Table]["Row"];

export type StudentCourse = Row<"courses">;
export type StudentLesson = Row<"lessons">;
export type StudentResource = Row<"lesson_resources"> & { playbackUrl: string | null };
export type StudentLiveSession = Row<"live_sessions">;

export type StudentLiveSessionView = StudentLiveSession & {
  courseTitle: string | null;
  cohortName: string | null;
};

export type StudentLiveHub = {
  upcoming: StudentLiveSessionView[];
  replays: StudentLiveSessionView[];
};

export type StudentCourseProgress = {
  course: StudentCourse;
  lessonCount: number;
  completedCount: number;
  nextLessonId: string | null;
};

export type StudentHomeData = {
  learnerId: string | null;
  firstName: string;
  cohortName: string;
  courses: StudentCourseProgress[];
  nextLesson: StudentLesson | null;
  upcomingLives: StudentLiveSession[];
  completedLessonIds: string[];
};

export type StudentQuizQuestion = {
  id: string;
  prompt: string;
  explanation: string | null;
  options: Array<{ id: string; label: string }>;
};

export type StudentQuiz = {
  id: string;
  title: string;
  passingScore: number;
  questions: StudentQuizQuestion[];
};

export type StudentLessonOutlineItem = {
  id: string;
  title: string;
  moduleTitle: string | null;
  orderIndex: number;
  completed: boolean;
};

export type StudentLessonData = {
  lesson: StudentLesson;
  course: StudentCourse | null;
  resources: StudentResource[];
  quiz: StudentQuiz | null;
  completed: boolean;
  outline: StudentLessonOutlineItem[];
  lessonNumber: number;
  nextLesson: StudentLessonOutlineItem | null;
  note: string;
};

function firstError(errors: Array<Error | null>): Error | null {
  return errors.find((error): error is Error => Boolean(error)) ?? null;
}

export async function loadStudentHome(
  organizationId: string,
  userId: string,
): Promise<StudentHomeData> {
  const [profile, learnerProfile, courses, lessons, progress, lives] = await Promise.all([
    supabase.from("profiles").select("full_name, cohort_name").eq("id", userId).maybeSingle(),
    supabase
      .from("learner_profiles")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("courses")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "published")
      .order("updated_at", { ascending: false }),
    supabase
      .from("lessons")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "published")
      .order("order_index", { ascending: true }),
    supabase
      .from("progress")
      .select("lesson_id, status")
      .eq("organization_id", organizationId)
      .eq("user_id", userId),
    supabase
      .from("live_sessions")
      .select("*")
      .eq("organization_id", organizationId)
      .in("status", ["scheduled", "live"])
      .gte("starts_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order("starts_at", { ascending: true })
      .limit(4),
  ]);

  const error = firstError([
    profile.error,
    learnerProfile.error,
    courses.error,
    lessons.error,
    progress.error,
    lives.error,
  ]);
  if (error) throw error;

  const completedIds = new Set(
    (progress.data ?? [])
      .filter((item) => item.status === "completed" && item.lesson_id)
      .map((item) => item.lesson_id as string),
  );
  const visibleLessons = lessons.data ?? [];

  const courseProgress = (courses.data ?? []).map((course) => {
    const courseLessons = visibleLessons.filter((lesson) => lesson.course_id === course.id);
    const nextLesson = courseLessons.find((lesson) => !completedIds.has(lesson.id));
    return {
      course,
      lessonCount: courseLessons.length,
      completedCount: courseLessons.filter((lesson) => completedIds.has(lesson.id)).length,
      nextLessonId: nextLesson?.id ?? courseLessons[0]?.id ?? null,
    };
  });

  const nextLesson = visibleLessons.find((lesson) => !completedIds.has(lesson.id)) ?? null;

  return {
    learnerId: learnerProfile.data?.id ?? null,
    firstName: profile.data?.full_name?.split(" ")[0] || "Élève",
    cohortName: profile.data?.cohort_name || "Mon espace Karanta",
    courses: courseProgress,
    nextLesson,
    upcomingLives: lives.data ?? [],
    completedLessonIds: [...completedIds],
  };
}

export async function loadStudentLiveHub(organizationId: string): Promise<StudentLiveHub> {
  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);

  const [sessions, courses, cohorts] = await Promise.all([
    supabase
      .from("live_sessions")
      .select("*")
      .eq("organization_id", organizationId)
      .in("status", ["scheduled", "live", "completed"])
      .gte("starts_at", since.toISOString())
      .order("starts_at", { ascending: false })
      .limit(60),
    supabase.from("courses").select("id, title").eq("organization_id", organizationId),
    supabase.from("cohorts").select("id, name").eq("organization_id", organizationId),
  ]);

  const error = firstError([sessions.error, courses.error, cohorts.error]);
  if (error) throw error;

  const courseNames = new Map((courses.data ?? []).map((course) => [course.id, course.title]));
  const cohortNames = new Map((cohorts.data ?? []).map((cohort) => [cohort.id, cohort.name]));
  const views = (sessions.data ?? []).map((session) => ({
    ...session,
    courseTitle: session.course_id ? (courseNames.get(session.course_id) ?? null) : null,
    cohortName: session.cohort_id ? (cohortNames.get(session.cohort_id) ?? null) : null,
  }));
  const now = Date.now();

  return {
    upcoming: views
      .filter(
        (session) =>
          session.status === "live" ||
          (session.status === "scheduled" &&
            (session.ends_at
              ? new Date(session.ends_at).getTime() >= now
              : new Date(session.starts_at).getTime() >= now)),
      )
      .sort((left, right) => {
        if (left.status === "live" && right.status !== "live") return -1;
        if (right.status === "live" && left.status !== "live") return 1;
        return new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime();
      }),
    replays: views.filter(
      (session) => session.status === "completed" && Boolean(session.replay_url),
    ),
  };
}

async function createPlaybackUrl(resource: Row<"lesson_resources">): Promise<StudentResource> {
  if (!resource.storage_path) return { ...resource, playbackUrl: resource.external_url };

  const { data, error } = await supabase.storage
    .from("course-media")
    .createSignedUrl(resource.storage_path, 60 * 60);

  return {
    ...resource,
    playbackUrl: error ? null : data.signedUrl,
  };
}

export async function loadStudentLesson(
  organizationId: string,
  userId: string,
  lessonId: string,
): Promise<StudentLessonData> {
  const [lesson, resources, quizzes, progress, note] = await Promise.all([
    supabase
      .from("lessons")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", lessonId)
      .eq("status", "published")
      .maybeSingle(),
    supabase
      .from("lesson_resources")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("lesson_id", lessonId)
      .eq("status", "active")
      .order("order_index", { ascending: true }),
    supabase
      .from("quizzes")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("lesson_id", lessonId)
      .eq("status", "published")
      .order("created_at", { ascending: true })
      .limit(1),
    supabase
      .from("progress")
      .select("lesson_id, status")
      .eq("organization_id", organizationId)
      .eq("user_id", userId),
    supabase
      .from("lesson_notes")
      .select("body")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .eq("lesson_id", lessonId)
      .maybeSingle(),
  ]);

  const primaryError = firstError([
    lesson.error,
    resources.error,
    quizzes.error,
    progress.error,
    note.error,
  ]);
  if (primaryError) throw primaryError;
  if (!lesson.data) throw new Error("Cette leçon n'est pas disponible.");
  const lessonRow = lesson.data;

  const coursePromise = lessonRow.course_id
    ? supabase
        .from("courses")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("id", lessonRow.course_id)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });
  const modulesPromise = lessonRow.course_id
    ? supabase
        .from("course_modules")
        .select("id, title, order_index")
        .eq("organization_id", organizationId)
        .eq("course_id", lessonRow.course_id)
        .eq("status", "published")
        .order("order_index", { ascending: true })
    : Promise.resolve({ data: [], error: null });
  const outlinePromise = lessonRow.course_id
    ? supabase
        .from("lessons")
        .select("id, title, module_id, order_index")
        .eq("organization_id", organizationId)
        .eq("course_id", lessonRow.course_id)
        .eq("status", "published")
        .order("order_index", { ascending: true })
    : Promise.resolve({ data: [], error: null });
  const quiz = quizzes.data?.[0] ?? null;
  const questionsPromise = quiz
    ? supabase
        .from("quiz_questions")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("quiz_id", quiz.id)
        .order("order_index", { ascending: true })
    : Promise.resolve({ data: [], error: null });

  const [course, modules, outlineRows, questions, playableResources] = await Promise.all([
    coursePromise,
    modulesPromise,
    outlinePromise,
    questionsPromise,
    Promise.all((resources.data ?? []).map(createPlaybackUrl)),
  ]);
  const secondaryError = firstError([
    course.error,
    modules.error,
    outlineRows.error,
    questions.error,
  ]);
  if (secondaryError) throw secondaryError;

  const completedLessonIds = new Set(
    (progress.data ?? [])
      .filter((item) => item.status === "completed" && item.lesson_id)
      .map((item) => item.lesson_id as string),
  );
  const moduleNames = new Map((modules.data ?? []).map((module) => [module.id, module.title]));
  const outline: StudentLessonOutlineItem[] = (outlineRows.data ?? []).map((item, index) => ({
    id: item.id,
    title: item.title,
    moduleTitle: item.module_id ? (moduleNames.get(item.module_id) ?? null) : null,
    orderIndex: item.order_index ?? index,
    completed: completedLessonIds.has(item.id),
  }));
  const currentIndex = outline.findIndex((item) => item.id === lessonRow.id);

  let studentQuiz: StudentQuiz | null = null;
  if (quiz && questions.data?.length) {
    const questionIds = questions.data.map((question) => question.id);
    const { data: options, error: optionsError } = await supabase
      .from("quiz_options")
      .select("id, question_id, label, order_index")
      .eq("organization_id", organizationId)
      .in("question_id", questionIds)
      .order("order_index", { ascending: true });
    if (optionsError) throw optionsError;

    studentQuiz = {
      id: quiz.id,
      title: quiz.title,
      passingScore: quiz.passing_score,
      questions: questions.data.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        explanation: question.explanation,
        options: (options ?? [])
          .filter((option) => option.question_id === question.id)
          .map((option) => ({ id: option.id, label: option.label })),
      })),
    };
  }

  return {
    lesson: lessonRow,
    course: course.data,
    resources: playableResources,
    quiz: studentQuiz,
    completed: completedLessonIds.has(lessonRow.id),
    outline,
    lessonNumber: currentIndex >= 0 ? currentIndex + 1 : 1,
    nextLesson: currentIndex >= 0 ? (outline[currentIndex + 1] ?? null) : null,
    note: note.data?.body ?? "",
  };
}

export async function saveStudentLessonNote(
  organizationId: string,
  userId: string,
  lessonId: string,
  body: string,
): Promise<void> {
  const { error } = await supabase.from("lesson_notes").upsert(
    {
      organization_id: organizationId,
      user_id: userId,
      lesson_id: lessonId,
      body: body.slice(0, 10000),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,user_id,lesson_id" },
  );

  if (error) throw error;
}

export async function markLessonComplete(
  organizationId: string,
  userId: string,
  lessonId: string,
): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from("progress")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (readError) throw readError;

  const result = existing
    ? await supabase
        .from("progress")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", existing.id)
    : await supabase.from("progress").insert({
        organization_id: organizationId,
        user_id: userId,
        lesson_id: lessonId,
        status: "completed",
        completed_at: new Date().toISOString(),
      });
  if (result.error) throw result.error;
}

export async function submitStudentQuiz(
  quizId: string,
  answers: Array<{ question_id: string; selected_option_ids: string[] }>,
): Promise<number> {
  const { data, error } = await supabase.rpc("submit_quiz_attempt", {
    p_quiz_id: quizId,
    p_answers: answers as Json,
  });
  if (error) throw error;
  const result = data?.[0];
  if (!result) throw new Error("Le résultat du quiz n'a pas pu être calculé.");
  return Number(result.score);
}
