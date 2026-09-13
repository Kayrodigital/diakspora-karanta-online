import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { OrganizationRole } from "@/lib/auth/portal-access";

type Tables = Database["public"]["Tables"];
type Row<Name extends keyof Tables> = Tables[Name]["Row"];

export type TeacherLearner = {
  id: string;
  userId: string | null;
  fullName: string;
  preferredName: string | null;
  status: string;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  averageQuizScore: number | null;
  lastActivityAt: string | null;
  pendingHomework: number;
};

export type TeacherCourse = {
  id: string;
  title: string;
  level: string | null;
  status: string;
  lessonCount: number;
  cohortNames: string[];
};

export type TeacherCohort = {
  id: string;
  name: string;
  code: string | null;
  level: string | null;
  programLevelId: string | null;
  status: string;
  learners: TeacherLearner[];
  courses: TeacherCourse[];
  averageProgress: number;
};

export type TeacherHomework = Row<"homework_submissions"> & {
  learnerName: string;
  lessonTitle: string;
  signedUrl: string | null;
};

export type TeacherDashboardData = {
  teacherName: string;
  cohorts: TeacherCohort[];
  courses: TeacherCourse[];
  upcomingLives: Row<"live_sessions">[];
  liveSessions: Row<"live_sessions">[];
  homework: TeacherHomework[];
};

export async function reviewHomeworkSubmission(input: {
  submissionId: string;
  feedback: string;
  status: "graded" | "resubmit_requested";
  reviewerUserId: string;
}) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("homework_submissions")
    .update({
      feedback_text: input.feedback.trim(),
      feedback_by: input.reviewerUserId,
      feedback_at: now,
      status: input.status,
      updated_at: now,
    })
    .eq("id", input.submissionId);
  if (error) throw error;
}

function firstError(errors: Array<Error | null>): Error | null {
  return errors.find((error): error is Error => Boolean(error)) ?? null;
}

function emptyResult<T>() {
  return Promise.resolve({ data: [] as T[], error: null });
}

function latestDate(values: Array<string | null | undefined>): string | null {
  return (
    values
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null
  );
}

export async function loadTeacherDashboard(
  organizationId: string,
  userId: string,
  role: OrganizationRole,
): Promise<TeacherDashboardData> {
  const [profileResult, directCohortsResult, staffMembershipsResult] = await Promise.all([
    supabase.from("profiles").select("full_name, preferred_name").eq("id", userId).maybeSingle(),
    role === "pedagogical_manager"
      ? supabase
          .from("cohorts")
          .select("*")
          .eq("organization_id", organizationId)
          .neq("status", "archived")
      : supabase
          .from("cohorts")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("teacher_id", userId)
          .neq("status", "archived"),
    supabase
      .from("cohort_memberships")
      .select("cohort_id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .eq("status", "active")
      .in("role", ["class_manager", "assistant_teacher"]),
  ]);

  const initialError = firstError([
    profileResult.error,
    directCohortsResult.error,
    staffMembershipsResult.error,
  ]);
  if (initialError) throw initialError;

  const directCohorts = directCohortsResult.data ?? [];
  const extraCohortIds = (staffMembershipsResult.data ?? [])
    .map((membership) => membership.cohort_id)
    .filter((id) => !directCohorts.some((cohort) => cohort.id === id));
  const extraCohortsResult = extraCohortIds.length
    ? await supabase
        .from("cohorts")
        .select("*")
        .eq("organization_id", organizationId)
        .in("id", extraCohortIds)
        .neq("status", "archived")
    : { data: [], error: null };
  if (extraCohortsResult.error) throw extraCohortsResult.error;

  const cohorts = [...directCohorts, ...(extraCohortsResult.data ?? [])].sort((left, right) =>
    left.name.localeCompare(right.name, "fr"),
  );
  const cohortIds = cohorts.map((cohort) => cohort.id);

  if (cohortIds.length === 0) {
    return {
      teacherName:
        profileResult.data?.preferred_name || profileResult.data?.full_name || "Professeur",
      cohorts: [],
      courses: [],
      upcomingLives: [],
      liveSessions: [],
      homework: [],
    };
  }

  const [learnerMemberships, courseAssignments, liveSessions] = await Promise.all([
    supabase
      .from("learner_cohort_memberships")
      .select("learner_id, cohort_id")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .in("cohort_id", cohortIds),
    supabase
      .from("course_cohorts")
      .select("course_id, cohort_id")
      .eq("organization_id", organizationId)
      .in("cohort_id", cohortIds),
    supabase
      .from("live_sessions")
      .select("*")
      .eq("organization_id", organizationId)
      .gte("starts_at", new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
      .order("starts_at", { ascending: false })
      .limit(50),
  ]);

  const relationshipError = firstError([
    learnerMemberships.error,
    courseAssignments.error,
    liveSessions.error,
  ]);
  if (relationshipError) throw relationshipError;

  const learnerIds = [...new Set((learnerMemberships.data ?? []).map((item) => item.learner_id))];
  const courseIds = [...new Set((courseAssignments.data ?? []).map((item) => item.course_id))];
  const [learnersResult, coursesResult, lessonsResult] = await Promise.all([
    learnerIds.length
      ? supabase
          .from("learner_profiles")
          .select("*")
          .eq("organization_id", organizationId)
          .in("id", learnerIds)
      : emptyResult<Row<"learner_profiles">>(),
    courseIds.length
      ? supabase
          .from("courses")
          .select("*")
          .eq("organization_id", organizationId)
          .in("id", courseIds)
      : emptyResult<Row<"courses">>(),
    courseIds.length
      ? supabase
          .from("lessons")
          .select("*")
          .eq("organization_id", organizationId)
          .in("course_id", courseIds)
          .neq("status", "archived")
      : emptyResult<Row<"lessons">>(),
  ]);

  const contentError = firstError([learnersResult.error, coursesResult.error, lessonsResult.error]);
  if (contentError) throw contentError;

  const learners = learnersResult.data ?? [];
  const lessons = lessonsResult.data ?? [];
  const learnerUserIds = learners
    .map((learner) => learner.user_id)
    .filter((id): id is string => Boolean(id));
  const [progressResult, attemptsResult, homeworkResult] = await Promise.all([
    learnerUserIds.length
      ? supabase
          .from("progress")
          .select("user_id, lesson_id, status, completed_at")
          .eq("organization_id", organizationId)
          .in("user_id", learnerUserIds)
      : emptyResult<Pick<Row<"progress">, "user_id" | "lesson_id" | "status" | "completed_at">>(),
    learnerUserIds.length
      ? supabase
          .from("quiz_attempts")
          .select("user_id, score, status, submitted_at, graded_at")
          .eq("organization_id", organizationId)
          .in("user_id", learnerUserIds)
          .in("status", ["submitted", "graded"])
      : emptyResult<
          Pick<Row<"quiz_attempts">, "user_id" | "score" | "status" | "submitted_at" | "graded_at">
        >(),
    learnerUserIds.length
      ? supabase
          .from("homework_submissions")
          .select("*")
          .eq("organization_id", organizationId)
          .in("user_id", learnerUserIds)
          .order("created_at", { ascending: false })
      : emptyResult<Row<"homework_submissions">>(),
  ]);

  const activityError = firstError([
    progressResult.error,
    attemptsResult.error,
    homeworkResult.error,
  ]);
  if (activityError) throw activityError;

  const learnerMap = new Map(learners.map((learner) => [learner.id, learner]));
  const lessonMap = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const courseRows = coursesResult.data ?? [];
  const courseMap = new Map(courseRows.map((course) => [course.id, course]));

  const summarizeLearner = (learner: Row<"learner_profiles">, cohortId: string) => {
    const cohortCourseIds = new Set(
      (courseAssignments.data ?? [])
        .filter((item) => item.cohort_id === cohortId)
        .map((item) => item.course_id),
    );
    const cohortLessonIds = new Set(
      lessons
        .filter((lesson) => lesson.course_id && cohortCourseIds.has(lesson.course_id))
        .map((lesson) => lesson.id),
    );
    const learnerProgress = (progressResult.data ?? []).filter(
      (item) =>
        item.user_id === learner.user_id && item.lesson_id && cohortLessonIds.has(item.lesson_id),
    );
    const completedLessons = new Set(
      learnerProgress.filter((item) => item.status === "completed").map((item) => item.lesson_id),
    ).size;
    const scores = (attemptsResult.data ?? [])
      .filter((attempt) => attempt.user_id === learner.user_id && attempt.score !== null)
      .map((attempt) => Number(attempt.score));
    const learnerHomework = (homeworkResult.data ?? []).filter(
      (item) =>
        item.user_id === learner.user_id && item.lesson_id && cohortLessonIds.has(item.lesson_id),
    );

    return {
      id: learner.id,
      userId: learner.user_id,
      fullName: learner.full_name,
      preferredName: learner.preferred_name,
      status: learner.status,
      completedLessons,
      totalLessons: cohortLessonIds.size,
      progressPercent:
        cohortLessonIds.size > 0 ? Math.round((completedLessons / cohortLessonIds.size) * 100) : 0,
      averageQuizScore:
        scores.length > 0
          ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
          : null,
      lastActivityAt: latestDate([
        ...learnerProgress.map((item) => item.completed_at),
        ...(attemptsResult.data ?? [])
          .filter((attempt) => attempt.user_id === learner.user_id)
          .flatMap((attempt) => [attempt.graded_at, attempt.submitted_at]),
      ]),
      pendingHomework: learnerHomework.filter((item) =>
        ["submitted", "pending", null].includes(item.status),
      ).length,
    } satisfies TeacherLearner;
  };

  const courseSummaries = courseRows.map((course) => ({
    id: course.id,
    title: course.title,
    level: course.level,
    status: course.status,
    lessonCount: lessons.filter((lesson) => lesson.course_id === course.id).length,
    cohortNames: cohorts
      .filter((cohort) =>
        (courseAssignments.data ?? []).some(
          (item) => item.course_id === course.id && item.cohort_id === cohort.id,
        ),
      )
      .map((cohort) => cohort.name),
  }));
  const summaryMap = new Map(courseSummaries.map((course) => [course.id, course]));

  const cohortSummaries = cohorts.map((cohort) => {
    const cohortLearners = (learnerMemberships.data ?? [])
      .filter((membership) => membership.cohort_id === cohort.id)
      .flatMap((membership) => {
        const learner = learnerMap.get(membership.learner_id);
        return learner ? [summarizeLearner(learner, cohort.id)] : [];
      });
    const cohortCourses = (courseAssignments.data ?? [])
      .filter((assignment) => assignment.cohort_id === cohort.id)
      .flatMap((assignment) => {
        const summary = summaryMap.get(assignment.course_id);
        return summary ? [summary] : [];
      });

    return {
      id: cohort.id,
      name: cohort.name,
      code: cohort.code,
      level: cohort.level,
      programLevelId: cohort.program_level_id,
      status: cohort.status,
      learners: cohortLearners,
      courses: cohortCourses,
      averageProgress:
        cohortLearners.length > 0
          ? Math.round(
              cohortLearners.reduce((sum, learner) => sum + learner.progressPercent, 0) /
                cohortLearners.length,
            )
          : 0,
    } satisfies TeacherCohort;
  });

  const homework = await Promise.all(
    (homeworkResult.data ?? []).map(async (item) => {
      const signedUrl = item.file_url
        ? ((await supabase.storage.from("homework").createSignedUrl(item.file_url, 3600)).data
            ?.signedUrl ?? null)
        : null;
      return {
        ...item,
        learnerName:
          learners.find((learner) => learner.user_id === item.user_id)?.full_name ?? "Élève",
        lessonTitle: item.lesson_id
          ? lessonMap.get(item.lesson_id)?.title || "Leçon"
          : "Devoir général",
        signedUrl,
      };
    }),
  );

  return {
    teacherName:
      profileResult.data?.preferred_name || profileResult.data?.full_name || "Professeur",
    cohorts: cohortSummaries,
    courses: courseSummaries,
    upcomingLives: (liveSessions.data ?? [])
      .filter(
        (session) =>
          session.status === "live" ||
          (session.status === "scheduled" &&
            new Date(session.ends_at ?? session.starts_at).getTime() >= Date.now()),
      )
      .sort(
        (left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime(),
      ),
    liveSessions: liveSessions.data ?? [],
    homework,
  };
}
