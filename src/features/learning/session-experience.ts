import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { loadPortalAccess } from "@/lib/auth/portal-access";

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
  authenticated: boolean;
  activeProfileId: string | null;
  userId: string | null;
  resources: SessionResource[];
  activities: SessionActivity[];
};

function activitiesFlag(flags: Json): boolean {
  return Boolean(
    flags && typeof flags === "object" && !Array.isArray(flags) && flags.activities_v1 === true,
  );
}

async function playbackUrl(resource: ResourceRow): Promise<SessionResource> {
  if (!resource.storage_path) return { ...resource, playbackUrl: resource.external_url };
  const { data, error } = await supabase.storage
    .from("course-media")
    .createSignedUrl(resource.storage_path, 60 * 60);
  return { ...resource, playbackUrl: error ? null : data.signedUrl };
}

export async function loadSessionExperience(sessionId: string): Promise<SessionExperience> {
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

  const enabled = activitiesFlag(organizationResult.data?.feature_flags ?? null);
  if (!enabled) {
    return {
      enabled,
      authenticated: Boolean(userResult.data.user),
      activeProfileId: null,
      userId: userResult.data.user?.id ?? null,
      resources: [],
      activities: [],
    };
  }

  const accessPromise = userResult.data.user ? loadPortalAccess("family") : Promise.resolve(null);
  const activityIds = (activitiesResult.data ?? []).map((activity) => activity.id);
  const [access, resources] = await Promise.all([
    accessPromise,
    Promise.all((resourcesResult.data ?? []).map(playbackUrl)),
  ]);

  const attemptsResult =
    access && activityIds.length
      ? await supabase
          .from("activity_attempts")
          .select("*")
          .eq("profile_id", access.activeProfileId)
          .in("activity_id", activityIds)
      : { data: [], error: null };
  if (attemptsResult.error) throw attemptsResult.error;

  const attempts = new Map(
    (attemptsResult.data ?? []).map((attempt) => [attempt.activity_id, attempt] as const),
  );

  return {
    enabled,
    authenticated: Boolean(userResult.data.user),
    activeProfileId: access?.activeProfileId ?? null,
    userId: userResult.data.user?.id ?? null,
    resources,
    activities: (activitiesResult.data ?? []).map((activity) => ({
      ...activity,
      quizId: activity.legacy_quiz_id,
      attempt: attempts.get(activity.id) ?? null,
    })),
  };
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
