import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type LiveSession = Database["public"]["Tables"]["live_sessions"]["Row"];

export type LiveProvider = "zoom" | "google_meet" | "telegram" | "whatsapp" | "other";

export type LiveSessionInput = {
  title: string;
  description?: string;
  provider: LiveProvider;
  startsAt: string;
  durationMinutes: number;
  joinUrl?: string;
  courseId?: string;
  cohortId?: string;
};

export type LiveSessionUpdate = Partial<LiveSessionInput> & {
  status?: "scheduled" | "live" | "completed" | "cancelled";
  replayUrl?: string;
};

function validUrl(value: string | undefined, label: string): string | null {
  if (!value?.trim()) return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`${label} doit être une adresse web valide.`);
  }
  if (!["https:", "http:"].includes(url.protocol)) {
    throw new Error(`${label} doit commencer par https:// ou http://.`);
  }
  return url.toString();
}

function sessionTimes(startsAt: string, durationMinutes: number) {
  const starts = new Date(startsAt);
  if (Number.isNaN(starts.getTime())) throw new Error("La date du direct est invalide.");
  if (!Number.isFinite(durationMinutes) || durationMinutes < 15 || durationMinutes > 480) {
    throw new Error("La durée doit être comprise entre 15 minutes et 8 heures.");
  }
  return {
    startsAt: starts.toISOString(),
    endsAt: new Date(starts.getTime() + durationMinutes * 60_000).toISOString(),
  };
}

export async function createLiveSession(
  organizationId: string,
  userId: string,
  input: LiveSessionInput,
) {
  const { startsAt, endsAt } = sessionTimes(input.startsAt, input.durationMinutes);
  const { error } = await supabase.from("live_sessions").insert({
    organization_id: organizationId,
    created_by: userId,
    host_user_id: userId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    provider: input.provider,
    starts_at: startsAt,
    ends_at: endsAt,
    join_url: validUrl(input.joinUrl, "Le lien de participation"),
    course_id: input.courseId || null,
    cohort_id: input.cohortId || null,
    status: "scheduled",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris",
  });
  if (error) throw error;
}

export async function updateLiveSession(
  organizationId: string,
  session: LiveSession,
  input: LiveSessionUpdate,
) {
  const update: Database["public"]["Tables"]["live_sessions"]["Update"] = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) update.title = input.title.trim();
  if (input.description !== undefined) update.description = input.description.trim() || null;
  if (input.provider !== undefined) update.provider = input.provider;
  if (input.joinUrl !== undefined) {
    update.join_url = validUrl(input.joinUrl, "Le lien de participation");
  }
  if (input.replayUrl !== undefined) update.replay_url = validUrl(input.replayUrl, "Le replay");
  if (input.courseId !== undefined) update.course_id = input.courseId || null;
  if (input.cohortId !== undefined) update.cohort_id = input.cohortId || null;
  if (input.status !== undefined) update.status = input.status;

  if (input.startsAt !== undefined || input.durationMinutes !== undefined) {
    const currentDuration = session.ends_at
      ? Math.max(
          15,
          Math.round(
            (new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 60_000,
          ),
        )
      : 60;
    const { startsAt, endsAt } = sessionTimes(
      input.startsAt ?? session.starts_at,
      input.durationMinutes ?? currentDuration,
    );
    update.starts_at = startsAt;
    update.ends_at = endsAt;
  }

  const { error } = await supabase
    .from("live_sessions")
    .update(update)
    .eq("organization_id", organizationId)
    .eq("id", session.id);
  if (error) throw error;
}

export function liveDurationMinutes(session: LiveSession) {
  if (!session.ends_at) return 60;
  return Math.max(
    15,
    Math.round(
      (new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 60_000,
    ),
  );
}

export function localDateTimeValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export const liveProviderLabels: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  other: "Autre",
};
