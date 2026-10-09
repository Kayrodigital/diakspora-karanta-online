import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { resolveActiveProfile } from "@/lib/identity/profile-identity";

export type MajlissVillage = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  country: string | null;
  description: string | null;
  image_url: string | null;
  order_index: number;
  status: "draft" | "published" | "archived";
  published_at: string | null;
};

export type MajlissTeacher = {
  id: string;
  organization_id: string;
  display_name: string;
  slug: string;
  biography: string | null;
  photo_url: string | null;
  order_index: number;
  status: "draft" | "published" | "archived";
  published_at: string | null;
};

export type MajlissTeacherVillage = {
  id: string;
  organization_id: string;
  teacher_id: string;
  village_id: string;
  order_index: number;
};

export type MajlissRecording = {
  id: string;
  organization_id: string;
  village_id: string;
  teacher_id: string;
  title: string;
  slug: string;
  description: string | null;
  media_type: "audio" | "youtube" | "video";
  media_url: string;
  duration_seconds: number | null;
  recorded_on: string | null;
  order_index: number;
  language: string | null;
  access_tier: "free" | "premium";
  status: "draft" | "published" | "archived";
  thumbnail_url: string | null;
  source_key: string | null;
  source_metadata: Record<string, unknown>;
  published_at: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  original_file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  received_at: string | null;
  review_status: "pending" | "approved" | "rejected";
  upload_source: "admin" | "assistant_upload" | "whatsapp_import";
  uploaded_by: string | null;
  content_fingerprint: string | null;
  duplicate_of: string | null;
  processing_status: "uploaded" | "needs_normalization" | "ready" | "failed";
};

export type MajlissTeacherAssignment = {
  id: string;
  organization_id: string;
  user_id: string;
  teacher_id: string;
  village_id: string;
  status: "active" | "suspended";
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MediaProgress = {
  id: string;
  organization_id: string;
  profile_id: string;
  recording_id: string;
  actor_user_id: string;
  position_seconds: number;
  duration_seconds: number | null;
  last_played_at: string;
  completed_at: string | null;
};

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row> & Record<string, unknown>;
  Update: Partial<Row>;
  Relationships: [];
};

type MajlissDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      majliss_villages: Table<MajlissVillage>;
      majliss_teachers: Table<MajlissTeacher>;
      majliss_teacher_villages: Table<MajlissTeacherVillage>;
      majliss_recordings: Table<MajlissRecording>;
      majliss_teacher_assignments: Table<MajlissTeacherAssignment>;
      profile_media_progress: Table<MediaProgress>;
    };
  };
};

export const majlissDb = supabase as unknown as SupabaseClient<MajlissDatabase>;
const db = majlissDb;

export type MajlissCatalog = {
  enabled: boolean;
  organizationId: string;
  userId: string | null;
  activeProfileId: string | null;
  villages: MajlissVillage[];
  teachers: MajlissTeacher[];
  teacherVillages: MajlissTeacherVillage[];
  recordings: MajlissRecording[];
  progress: MediaProgress[];
};

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function loadMajlissCatalog(): Promise<MajlissCatalog> {
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, feature_flags")
    .eq("slug", "diakspora")
    .single();
  fail(organizationError);
  if (!organization) throw new Error("Organisation Diakspora introuvable.");
  const featureFlags =
    organization.feature_flags &&
    typeof organization.feature_flags === "object" &&
    !Array.isArray(organization.feature_flags)
      ? organization.feature_flags
      : {};

  const [villagesResult, teachersResult, linksResult, recordingsResult, authResult] =
    await Promise.all([
      db
        .from("majliss_villages")
        .select("*")
        .eq("organization_id", organization.id)
        .order("order_index")
        .order("name"),
      db
        .from("majliss_teachers")
        .select("*")
        .eq("organization_id", organization.id)
        .order("order_index")
        .order("display_name"),
      db
        .from("majliss_teacher_villages")
        .select("*")
        .eq("organization_id", organization.id)
        .order("order_index"),
      db
        .from("majliss_recordings")
        .select("*")
        .eq("organization_id", organization.id)
        .order("order_index")
        .order("recorded_on", { ascending: false, nullsFirst: false }),
      supabase.auth.getUser(),
    ]);
  [villagesResult, teachersResult, linksResult, recordingsResult].forEach((result) =>
    fail(result.error),
  );

  const user = authResult.data.user;
  let activeProfileId: string | null = null;
  let progress: MediaProgress[] = [];
  if (user) {
    const activeProfile = await resolveActiveProfile({
      authUserId: user.id,
      organizationId: organization.id,
      profileIdentityV2: featureFlags.profile_identity_v2 === true,
    });
    activeProfileId = activeProfile.id;
    const progressResult = await db
      .from("profile_media_progress")
      .select("*")
      .eq("profile_id", activeProfile.id)
      .order("last_played_at", { ascending: false })
      .limit(12);
    fail(progressResult.error);
    progress = progressResult.data ?? [];
  }

  const recordings = await Promise.all(
    (recordingsResult.data ?? []).map(async (recording) => {
      if (!recording.storage_bucket || !recording.storage_path) return recording;
      const { data } = await supabase.storage
        .from(recording.storage_bucket)
        .createSignedUrl(recording.storage_path, 3600);
      return data?.signedUrl ? { ...recording, media_url: data.signedUrl } : recording;
    }),
  );

  return {
    enabled: featureFlags.majliss_v1 === true,
    organizationId: organization.id,
    userId: user?.id ?? null,
    activeProfileId,
    villages: villagesResult.data ?? [],
    teachers: teachersResult.data ?? [],
    teacherVillages: linksResult.data ?? [],
    recordings,
    progress,
  };
}

export async function saveMediaProgress(input: {
  organizationId: string;
  profileId: string;
  recordingId: string;
  actorUserId: string;
  positionSeconds: number;
  durationSeconds?: number | null;
  completed?: boolean;
}) {
  const { error } = await db.from("profile_media_progress").upsert(
    {
      organization_id: input.organizationId,
      profile_id: input.profileId,
      recording_id: input.recordingId,
      actor_user_id: input.actorUserId,
      position_seconds: Math.max(0, Math.floor(input.positionSeconds)),
      duration_seconds:
        input.durationSeconds == null ? null : Math.max(0, Math.floor(input.durationSeconds)),
      last_played_at: new Date().toISOString(),
      completed_at: input.completed ? new Date().toISOString() : null,
    },
    { onConflict: "profile_id,recording_id" },
  );
  fail(error);
}

export type MajlissAdminKind = "village" | "teacher" | "recording";

export async function createMajlissItem(
  organizationId: string,
  userId: string,
  input:
    | { kind: "village"; name: string; slug: string; country?: string; description?: string }
    | { kind: "teacher"; displayName: string; slug: string; biography?: string; villageId: string }
    | {
        kind: "recording";
        villageId: string;
        teacherId: string;
        title: string;
        slug: string;
        mediaType: MajlissRecording["media_type"];
        mediaUrl: string;
        durationSeconds?: number;
        language?: string;
      },
) {
  if (input.kind === "village") {
    const { error } = await db.from("majliss_villages").insert({
      organization_id: organizationId,
      name: input.name,
      slug: input.slug,
      country: input.country || null,
      description: input.description || null,
      status: "draft",
      order_index: 0,
      created_by: userId,
    });
    fail(error);
    return;
  }
  if (input.kind === "teacher") {
    const { data: teacher, error } = await db
      .from("majliss_teachers")
      .insert({
        organization_id: organizationId,
        display_name: input.displayName,
        slug: input.slug,
        biography: input.biography || null,
        status: "draft",
        order_index: 0,
        created_by: userId,
      })
      .select("id")
      .single();
    fail(error);
    const { error: linkError } = await db.from("majliss_teacher_villages").insert({
      organization_id: organizationId,
      teacher_id: teacher!.id,
      village_id: input.villageId,
      order_index: 0,
      created_by: userId,
    });
    fail(linkError);
    return;
  }
  const { error } = await db.from("majliss_recordings").insert({
    organization_id: organizationId,
    village_id: input.villageId,
    teacher_id: input.teacherId,
    title: input.title,
    slug: input.slug,
    media_type: input.mediaType,
    media_url: input.mediaUrl,
    duration_seconds: input.durationSeconds ?? null,
    language: input.language || null,
    access_tier: "free",
    status: "draft",
    order_index: 0,
    created_by: userId,
    source_key: input.mediaUrl,
    source_metadata: {},
  });
  fail(error);
}

export async function setMajlissItemStatus(
  kind: MajlissAdminKind,
  id: string,
  status: "draft" | "published" | "archived",
) {
  const publishedAt = status === "published" ? new Date().toISOString() : null;
  if (kind === "recording") {
    const { error } = await db
      .from("majliss_recordings")
      .update({
        status,
        published_at: publishedAt,
        review_status:
          status === "published" ? "approved" : status === "archived" ? "rejected" : "pending",
      })
      .eq("id", id);
    fail(error);
    return;
  }
  const { error } =
    kind === "village"
      ? await db.from("majliss_villages").update({ status, published_at: publishedAt }).eq("id", id)
      : await db
          .from("majliss_teachers")
          .update({ status, published_at: publishedAt })
          .eq("id", id);
  fail(error);
}

export async function deleteMajlissDraft(kind: MajlissAdminKind, id: string) {
  const table =
    kind === "village"
      ? "majliss_villages"
      : kind === "teacher"
        ? "majliss_teachers"
        : "majliss_recordings";
  const { error } = await db.from(table).delete().eq("id", id).eq("status", "draft");
  fail(error);
}

export async function setMajlissItemOrder(kind: MajlissAdminKind, id: string, orderIndex: number) {
  const table =
    kind === "village"
      ? "majliss_villages"
      : kind === "teacher"
        ? "majliss_teachers"
        : "majliss_recordings";
  const { error } = await db
    .from(table)
    .update({ order_index: Math.max(0, Math.floor(orderIndex)) })
    .eq("id", id);
  fail(error);
}

export async function updateMajlissRecordingReview(
  id: string,
  input: {
    title: string;
    description?: string;
    recordedOn?: string;
    villageId: string;
    teacherId: string;
    orderIndex: number;
  },
) {
  const { error } = await db
    .from("majliss_recordings")
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      recorded_on: input.recordedOn || null,
      village_id: input.villageId,
      teacher_id: input.teacherId,
      order_index: Math.max(0, Math.floor(input.orderIndex)),
    })
    .eq("id", id);
  fail(error);
}
