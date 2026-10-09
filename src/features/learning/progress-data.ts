import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ProgressRow = Database["public"]["Tables"]["profile_session_progress"]["Row"];

export type SessionProgressStatus = "not_started" | "in_progress" | "completed" | "validated";
export type SessionProgress = ProgressRow & {
  status: Exclude<SessionProgressStatus, "not_started">;
};

export type ValidationQueueItem = SessionProgress & {
  learnerName: string;
  sessionTitle: string;
};

export function summarizeProgress(progress: SessionProgress[], sessionIds: string[]) {
  const sessionIdSet = new Set(sessionIds);
  const relevant = progress.filter((item) => sessionIdSet.has(item.session_id));
  const completed = relevant.filter(
    (item) => item.status === "completed" || item.status === "validated",
  ).length;
  return {
    completed,
    total: sessionIds.length,
    percent: sessionIds.length ? Math.round((completed / sessionIds.length) * 100) : 0,
  };
}

export async function loadProfileProgress(profileId: string): Promise<SessionProgress[]> {
  const { data, error } = await supabase
    .from("profile_session_progress")
    .select("*")
    .eq("profile_id", profileId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SessionProgress[];
}

export async function startSessionProgress(input: {
  organizationId: string;
  profileId: string;
  sessionId: string;
}): Promise<void> {
  const { error } = await supabase.from("profile_session_progress").upsert(
    {
      organization_id: input.organizationId,
      profile_id: input.profileId,
      session_id: input.sessionId,
      status: "in_progress",
    },
    { onConflict: "profile_id,session_id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function completeSessionProgress(progressId: string): Promise<void> {
  const { data, error } = await supabase
    .from("profile_session_progress")
    .update({ status: "completed" })
    .eq("id", progressId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Cette progression ne peut pas être modifiée.");
}

export async function loadValidationQueue(organizationId: string): Promise<ValidationQueueItem[]> {
  const { data: rows, error } = await supabase
    .from("profile_session_progress")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "completed")
    .order("completed_at", { ascending: true });
  if (error) throw error;
  if (!rows?.length) return [];

  const profileIds = [...new Set(rows.map((row) => row.profile_id))];
  const sessionIds = [...new Set(rows.map((row) => row.session_id))];
  const [profilesResult, sessionsResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name, preferred_name").in("id", profileIds),
    supabase.from("sessions").select("id, title, requires_validation").in("id", sessionIds),
  ]);
  const firstError = profilesResult.error ?? sessionsResult.error;
  if (firstError) throw firstError;
  const profiles = new Map((profilesResult.data ?? []).map((row) => [row.id, row]));
  const sessions = new Map((sessionsResult.data ?? []).map((row) => [row.id, row]));

  return (rows as SessionProgress[]).flatMap((row) => {
    const session = sessions.get(row.session_id);
    if (!session?.requires_validation) return [];
    const profile = profiles.get(row.profile_id);
    return [
      {
        ...row,
        learnerName: profile?.preferred_name || profile?.full_name || "Élève",
        sessionTitle: session.title,
      },
    ];
  });
}

export async function validateSessionProgress(progressId: string): Promise<void> {
  const { data, error } = await supabase
    .from("profile_session_progress")
    .update({ status: "validated" })
    .eq("id", progressId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Cette validation n’est pas autorisée pour votre classe.");
}
