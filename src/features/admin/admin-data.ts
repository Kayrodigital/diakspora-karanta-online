import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type AdminRole =
  | "admin"
  | "technician"
  | "pedagogical_manager"
  | "teacher"
  | "class_manager"
  | "parent"
  | "learner";

export type DirectoryMember = Tables<"organization_memberships"> & {
  profile: Pick<Tables<"profiles">, "full_name" | "preferred_name" | "email" | "phone"> | null;
};

export type LearnerDirectoryItem = Tables<"learner_profiles"> & {
  cohorts: string[];
};

export type AdminDashboardData = {
  members: DirectoryMember[];
  learners: LearnerDirectoryItem[];
  cohorts: Tables<"cohorts">[];
  courses: Tables<"courses">[];
  invitations: Tables<"organization_invitations">[];
  courseCohorts: Tables<"course_cohorts">[];
};

function message(error: unknown) {
  return error instanceof Error ? error.message : "Une erreur est survenue.";
}

export async function loadAdminDashboard(organizationId: string): Promise<AdminDashboardData> {
  const [
    membershipsResult,
    profilesResult,
    learnersResult,
    learnerClassesResult,
    cohortsResult,
    coursesResult,
    invitationsResult,
    courseCohortsResult,
  ] = await Promise.all([
    supabase
      .from("organization_memberships")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, preferred_name, email, phone"),
    supabase
      .from("learner_profiles")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("learner_cohort_memberships")
      .select("learner_id, cohort_id, status")
      .eq("organization_id", organizationId),
    supabase
      .from("cohorts")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("courses")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("organization_invitations")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("course_cohorts").select("*").eq("organization_id", organizationId),
  ]);

  const results = [
    membershipsResult,
    profilesResult,
    learnersResult,
    learnerClassesResult,
    cohortsResult,
    coursesResult,
    invitationsResult,
    courseCohortsResult,
  ];
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);

  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const learnerClasses = learnerClassesResult.data ?? [];

  return {
    members: (membershipsResult.data ?? []).map((membership) => ({
      ...membership,
      profile: profiles.get(membership.user_id) ?? null,
    })),
    learners: (learnersResult.data ?? []).map((learner) => ({
      ...learner,
      cohorts: learnerClasses
        .filter(
          (membership) => membership.learner_id === learner.id && membership.status === "active",
        )
        .map((membership) => membership.cohort_id),
    })),
    cohorts: cohortsResult.data ?? [],
    courses: coursesResult.data ?? [],
    invitations: invitationsResult.data ?? [],
    courseCohorts: courseCohortsResult.data ?? [],
  };
}

export type AdminMemberAction =
  | {
      action: "invite";
      organizationId: string;
      fullName: string;
      email: string;
      phone?: string;
      role: AdminRole;
      cohortId?: string;
    }
  | {
      action: "create_managed_learner";
      organizationId: string;
      fullName: string;
      phone?: string;
      guardianUserId: string;
      cohortId?: string;
    }
  | {
      action: "assign_learner";
      organizationId: string;
      learnerId: string;
      cohortId: string;
    }
  | {
      action: "set_learner_status";
      organizationId: string;
      learnerId: string;
      status: "active" | "suspended" | "completed" | "archived";
    }
  | {
      action: "set_member_status";
      organizationId: string;
      userId: string;
      status: "active" | "suspended";
    };

export async function runAdminMemberAction(payload: AdminMemberAction) {
  const { data, error } = await supabase.functions.invoke("admin-members", { body: payload });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));
  return data as { ok: true; emailSent?: boolean };
}

export async function assignCourseToCohort(input: {
  organizationId: string;
  userId: string;
  courseId: string;
  cohortId: string;
}) {
  const { error } = await supabase.from("course_cohorts").upsert(
    {
      organization_id: input.organizationId,
      course_id: input.courseId,
      cohort_id: input.cohortId,
      assigned_by: input.userId,
    },
    { onConflict: "course_id,cohort_id" },
  );
  if (error) throw new Error(message(error));
}
