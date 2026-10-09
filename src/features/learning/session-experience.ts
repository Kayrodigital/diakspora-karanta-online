import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { loadPortalAccess } from "@/lib/auth/portal-access";
import type { SessionProgress } from "./progress-data";

type Tables = Database["public"]["Tables"];
type ResourceRow = Tables["lesson_resources"]["Row"];
type ActivityRow = Tables["activities"]["Row"];
type AttemptRow = Tables["activity_attempts"]["Row"];

export type SessionResource = ResourceRow & { playbackUrl: string | null };
export type SessionActivity = ActivityRow & {
  quizId: string | null;
  attempt: AttemptRow | null;
};

export type SessionExperience = {
  enabled: boolean;
  progressEnabled: boolean;
  authenticated: boolean;
  activeProfileId: string | null;
  userId: string | null;
  resources: SessionResource[];
  activities: SessionActivity[];
  progress: SessionProgress | null;
  note: string;
};

function activitiesFlag(flags: Json): boolean {
  return Boolean(
    flags && typeof flags === "object" && !Array.isArray(flags) && flags.activities_v1 === true,
  );
}

function progressFlag(flags: Json): boolean {
  return Boolean(
    flags && typeof flags === "object" && !Array.isArray(flags) && flags.progress_v1 === true,
  );
}

async function playbackUrl(resource: ResourceRow): Promise<SessionResource> {
  if (!resource.storage_path) return { ...resource, playbackUrl: resource.external_url };
  const { data, error } = await supabase.storage
    .from("course-media")
    .createSignedUrl(resource.storage_path, 60 * 60);
  return { ...resource, playbackUrl: error ? null : data.signedUrl };
}

export async function loadSessionExperience(
  sessionId: string,
  lessonId: string,
  organizationId: string,
): Promise<SessionExperience> {
  const [organizationResult, resourcesResult, activitiesResult, userResult] = await Promise.all([
    supabase.from("organizations").select("feature_flags").eq("slug", "diakspora").maybeSingle(),
    supabase
      .from("lesson_resources")
      .select("*")
      .eq("session_id", sessionId)
      .eq("status", "active")
      .order("order_index"),
    supabase
      .from("activities")
      .select("*")
      .eq("session_id", sessionId)
      .eq("status", "published")
      .order("order_index"),
    supabase.auth.getUser(),
  ]);

  const error = organizationResult.error ?? resourcesResult.error ?? activitiesResult.error;
  if (error) throw error;

  const flags = organizationResult.data?.feature_flags ?? null;
  const enabled = activitiesFlag(flags);
  const progressEnabled = progressFlag(flags);
  if (!enabled) {
    return {
      enabled,
      progressEnabled,
      authenticated: Boolean(userResult.data.user),
      activeProfileId: null,
      userId: userResult.data.user?.id ?? null,
      resources: [],
      activities: [],
      progress: null,
      note: "",
    };
  }

  const accessPromise = userResult.data.user ? loadPortalAccess("family") : Promise.resolve(null);
  const activityIds = (activitiesResult.data ?? []).map((activity) => activity.id);
  const [access, resources] = await Promise.all([
    accessPromise,
    Promise.all((resourcesResult.data ?? []).map(playbackUrl)),
  ]);

  const [attemptsResult, progressResult, noteResult] = await Promise.all([
    access && activityIds.length
      ? supabase
          .from("activity_attempts")
          .select("*")
          .eq("profile_id", access.activeProfileId)
          .in("activity_id", activityIds)
      : Promise.resolve({ data: [], error: null }),
    access && progressEnabled
      ? supabase
          .from("profile_session_progress")
          .select("*")
          .eq("profile_id", access.activeProfileId)
          .eq("session_id", sessionId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    userResult.data.user
      ? supabase
          .from("lesson_notes")
          .select("body")
          .eq("organization_id", organizationId)
          .eq("user_id", userResult.data.user.id)
          .eq("lesson_id", lessonId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (attemptsResult.error) throw attemptsResult.error;
  if (progressResult.error) throw progressResult.error;
  if (noteResult.error) throw noteResult.error;

  const attempts = new Map(
    (attemptsResult.data ?? []).map((attempt) => [attempt.activity_id, attempt] as const),
  );

  return {
    enabled,
    progressEnabled,
    authenticated: Boolean(userResult.data.user),
    activeProfileId: access?.activeProfileId ?? null,
    userId: userResult.data.user?.id ?? null,
    resources,
    activities: (activitiesResult.data ?? []).map((activity) => ({
      ...activity,
      quizId: activity.legacy_quiz_id,
      attempt: attempts.get(activity.id) ?? null,
    })),
    progress: (progressResult.data as SessionProgress | null) ?? null,
    note: noteResult.data?.body ?? "",
  };
}

export async function saveSessionLessonNote(input: {
  organizationId: string;
  userId: string;
  lessonId: string;
  body: string;
}): Promise<void> {
  const { error } = await supabase.from("lesson_notes").upsert(
    {
      organization_id: input.organizationId,
      user_id: input.userId,
      lesson_id: input.lessonId,
      body: input.body.slice(0, 10000),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,user_id,lesson_id" },
  );
  if (error) throw error;
}

export async function saveSelfCorrection(input: {
  activity: SessionActivity;
  profileId: string;
  userId: string;
  evaluation: "understood" | "review" | null;
}): Promise<void> {
  const completed = input.evaluation !== null;
  const { error } = await supabase.from("activity_attempts").upsert(
    {
      organization_id: input.activity.organization_id,
      activity_id: input.activity.id,
      profile_id: input.profileId,
      user_id: input.userId,
      status: completed ? "completed" : "in_progress",
      completed_at: completed ? new Date().toISOString() : null,
      submitted_at: null,
      self_evaluation: input.evaluation,
    },
    { onConflict: "activity_id,profile_id" },
  );
  if (error) throw error;
}
