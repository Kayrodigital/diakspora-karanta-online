import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

export type PlanningConflict = {
  code: string;
  severity: "error" | "warning";
  message: string;
};

export type PlanningData = {
  cohorts: Row<"cohorts">[];
  sessions: Row<"live_sessions">[];
  subjects: Row<"subjects">[];
  courses: Row<"courses">[];
  courseAssignments: Row<"course_cohorts">[];
  learners: Row<"learner_profiles">[];
  learnerMemberships: Row<"learner_cohort_memberships">[];
  teachers: Array<{ id: string; name: string }>;
  preferences: Row<"planning_preferences">[];
  attendance: Row<"session_attendance">[];
  absenceReports: Row<"session_absence_reports">[];
  incidents: Row<"planning_incidents">[];
};

function firstError(errors: Array<{ message: string } | null>) {
  return errors.find(Boolean) ?? null;
}

export async function loadPlanningData(organizationId: string): Promise<PlanningData> {
  const [
    cohorts,
    sessions,
    subjects,
    courses,
    courseAssignments,
    learners,
    learnerMemberships,
    memberships,
    profiles,
    preferences,
    attendance,
    absenceReports,
    incidents,
  ] = await Promise.all([
    supabase.from("cohorts").select("*").eq("organization_id", organizationId).order("name"),
    supabase
      .from("live_sessions")
      .select("*")
      .eq("organization_id", organizationId)
      .order("starts_at"),
    supabase.from("subjects").select("*").eq("organization_id", organizationId).order("name"),
    supabase.from("courses").select("*").eq("organization_id", organizationId).order("title"),
    supabase.from("course_cohorts").select("*").eq("organization_id", organizationId),
    supabase.from("learner_profiles").select("*").eq("organization_id", organizationId),
    supabase.from("learner_cohort_memberships").select("*").eq("organization_id", organizationId),
    supabase
      .from("organization_memberships")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("role", "teacher")
      .eq("status", "active"),
    supabase.from("profiles").select("id, full_name, preferred_name").order("full_name"),
    supabase
      .from("planning_preferences")
      .select("*")
      .eq("organization_id", organizationId)
      .order("audience_group")
      .order("weekday"),
    supabase.from("session_attendance").select("*").eq("organization_id", organizationId),
    supabase.from("session_absence_reports").select("*").eq("organization_id", organizationId),
    supabase
      .from("planning_incidents")
      .select("*")
      .eq("organization_id", organizationId)
      .neq("status", "closed")
      .order("created_at", { ascending: false }),
  ]);

  const error = firstError([
    cohorts.error,
    sessions.error,
    subjects.error,
    courses.error,
    courseAssignments.error,
    learners.error,
    learnerMemberships.error,
    preferences.error,
    attendance.error,
    absenceReports.error,
    incidents.error,
  ]);
  if (error) throw error;

  const teacherIds = new Set((memberships.data ?? []).map((item) => item.user_id));
  const teacherProfiles = (profiles.data ?? []).filter((profile) => teacherIds.has(profile.id));

  return {
    cohorts: cohorts.data ?? [],
    sessions: sessions.data ?? [],
    subjects: subjects.data ?? [],
    courses: courses.data ?? [],
    courseAssignments: courseAssignments.data ?? [],
    learners: learners.data ?? [],
    learnerMemberships: learnerMemberships.data ?? [],
    teachers: teacherProfiles.map((profile) => ({
      id: profile.id,
      name: profile.preferred_name || profile.full_name || "Professeur",
    })),
    preferences: preferences.data ?? [],
    attendance: attendance.data ?? [],
    absenceReports: absenceReports.data ?? [],
    incidents: incidents.data ?? [],
  };
}

export type ClassInput = {
  name: string;
  code: string;
  audience: string;
  ageMin?: number;
  ageMax?: number;
  genderPolicy: string;
  subjectId?: string;
  objective: string;
  level: string;
  teachingLanguages: string[];
  teacherId?: string;
  maxStudents: number;
  startsOn?: string;
  endsOn?: string;
  usualWeekday?: number;
  usualStartTime?: string;
  usualEndTime?: string;
  timezone: string;
  deliveryFormat: string;
  enrollmentStatus: string;
  isPublic: boolean;
  publicSummary: string;
};

export async function createClass(organizationId: string, input: ClassInput) {
  const { error } = await supabase.from("cohorts").insert({
    organization_id: organizationId,
    name: input.name.trim(),
    code: input.code.trim(),
    audience: input.audience,
    age_min: input.ageMin ?? null,
    age_max: input.ageMax ?? null,
    gender_policy: input.genderPolicy,
    subject_id: input.subjectId || null,
    objective: input.objective,
    level: input.level.trim() || null,
    teaching_languages: input.teachingLanguages,
    teacher_id: input.teacherId || null,
    max_students: input.maxStudents,
    starts_on: input.startsOn || null,
    ends_on: input.endsOn || null,
    usual_weekday: input.usualWeekday ?? null,
    usual_start_time: input.usualStartTime || null,
    usual_end_time: input.usualEndTime || null,
    schedule_label:
      input.usualWeekday === undefined || !input.usualStartTime
        ? input.deliveryFormat === "on_demand"
          ? "Accessible à tout moment"
          : null
        : `${weekdayLabels[input.usualWeekday]} à ${input.usualStartTime}`,
    timezone: input.timezone,
    delivery_format: input.deliveryFormat,
    enrollment_status: input.enrollmentStatus,
    is_public: input.isPublic,
    public_summary: input.publicSummary.trim() || null,
    status: "active",
  });
  if (error) throw error;
}

export type SessionInput = {
  cohortId: string;
  courseId?: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  provider: string;
  joinUrl?: string;
  attendanceRequirement: string;
  maxAttendees?: number;
  replayDelayHours?: number;
  internalNotes?: string;
  recurrenceWeeks: number;
  overrideReason?: string;
};

export async function checkSessionConflicts(
  organizationId: string,
  cohort: Row<"cohorts">,
  input: SessionInput,
): Promise<PlanningConflict[]> {
  const { data, error } = await supabase.rpc("check_live_session_conflicts", {
    p_organization_id: organizationId,
    p_cohort_id: cohort.id,
    p_host_user_id: cohort.teacher_id ?? "00000000-0000-0000-0000-000000000000",
    p_starts_at: new Date(input.startsAt).toISOString(),
    p_ends_at: new Date(input.endsAt).toISOString(),
  });
  if (error) throw error;
  return (data ?? []) as PlanningConflict[];
}

export async function createSessions(
  organizationId: string,
  userId: string,
  cohort: Row<"cohorts">,
  input: SessionInput,
) {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (!(endsAt > startsAt)) throw new Error("L’heure de fin doit être après le début.");
  if (input.recurrenceWeeks < 1 || input.recurrenceWeeks > 52) {
    throw new Error("La récurrence doit comprendre entre 1 et 52 séances.");
  }
  const groupId = input.recurrenceWeeks > 1 ? crypto.randomUUID() : null;
  const rows = Array.from({ length: input.recurrenceWeeks }, (_, index) => {
    const start = new Date(startsAt.getTime() + index * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(endsAt.getTime() + index * 7 * 24 * 60 * 60 * 1000);
    return {
      organization_id: organizationId,
      cohort_id: cohort.id,
      course_id: input.courseId || null,
      host_user_id: cohort.teacher_id,
      created_by: userId,
      title: input.title.trim(),
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      timezone: input.timezone,
      provider: input.provider,
      join_url: input.joinUrl?.trim() || null,
      status: "scheduled",
      attendance_requirement: input.attendanceRequirement,
      max_attendees: input.maxAttendees ?? cohort.max_students,
      replay_due_at: input.replayDelayHours
        ? new Date(end.getTime() + input.replayDelayHours * 60 * 60 * 1000).toISOString()
        : null,
      internal_notes: input.internalNotes?.trim() || null,
      recurrence_group_id: groupId,
      recurrence_rule: groupId ? `FREQ=WEEKLY;COUNT=${input.recurrenceWeeks}` : null,
      conflict_override_reason: input.overrideReason?.trim() || null,
    } satisfies Database["public"]["Tables"]["live_sessions"]["Insert"];
  });
  const { error } = await supabase.from("live_sessions").insert(rows);
  if (error) throw error;
}

export async function updateSession(
  organizationId: string,
  sessionId: string,
  input: Database["public"]["Tables"]["live_sessions"]["Update"],
) {
  const { error } = await supabase
    .from("live_sessions")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("id", sessionId);
  if (error) throw error;
}

export async function saveAttendance(
  organizationId: string,
  userId: string,
  sessionId: string,
  entries: Array<{ learnerId: string; status: string }>,
) {
  const { error } = await supabase.from("session_attendance").upsert(
    entries.map((entry) => ({
      organization_id: organizationId,
      live_session_id: sessionId,
      learner_id: entry.learnerId,
      status: entry.status,
      recorded_by: userId,
    })),
    { onConflict: "live_session_id,learner_id" },
  );
  if (error) throw error;
}

export async function reportAbsence(
  organizationId: string,
  userId: string,
  liveSessionId: string,
  learnerId: string,
  reason: string,
) {
  const { error } = await supabase.from("session_absence_reports").upsert(
    {
      organization_id: organizationId,
      live_session_id: liveSessionId,
      learner_id: learnerId,
      reason: reason.trim() || null,
      reported_by: userId,
    },
    { onConflict: "live_session_id,learner_id" },
  );
  if (error) throw error;
}

export async function reportPlanningIncident(
  organizationId: string,
  userId: string,
  liveSessionId: string | null,
  kind: string,
  description: string,
) {
  const { error } = await supabase.from("planning_incidents").insert({
    organization_id: organizationId,
    live_session_id: liveSessionId,
    reported_by: userId,
    kind,
    description: description.trim(),
  });
  if (error) throw error;
}

export async function togglePlanningPreference(id: string, active: boolean) {
  const { error } = await supabase
    .from("planning_preferences")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export const weekdayLabels = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

export const attendanceLabels: Record<string, string> = {
  present: "Présent",
  excused_absence: "Absent justifié",
  unexcused_absence: "Absent non justifié",
  late: "En retard",
  excused: "Excusé",
  not_required: "Présence non requise",
};

export const requirementLabels: Record<string, string> = {
  required: "Présence obligatoire",
  recommended: "Présence recommandée",
  optional: "Présence facultative",
  not_required: "Contenu en autonomie",
};
