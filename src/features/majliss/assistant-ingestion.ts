import { Upload } from "tus-js-client";

import { supabase } from "@/integrations/supabase/client";
import {
  majlissDb,
  type MajlissTeacherAssignment,
  type MajlissTeacher,
  type MajlissVillage,
} from "./majliss-data";
import { mimeFor, validateAudioFile } from "./audio-validation";

const BUCKET = "majliss-ingestion";

export type AssignmentOption = MajlissTeacherAssignment & {
  teacher: MajlissTeacher;
  village: MajlissVillage;
};

export type MajlissUploadDestination = {
  organizationId: string;
  villageId: string;
  teacherId: string;
  assignmentId?: string;
};

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function loadAssistantAssignments(): Promise<{
  enabled: boolean;
  userId: string;
  assignments: AssignmentOption[];
}> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  fail(authError);
  if (!authData.user) throw new Error("Connexion requise.");

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, feature_flags")
    .eq("slug", "diakspora")
    .single();
  fail(organizationError);

  const { data: assignments, error: assignmentsError } = await majlissDb
    .from("majliss_teacher_assignments")
    .select("*")
    .eq("organization_id", organization!.id)
    .eq("user_id", authData.user.id)
    .eq("status", "active")
    .order("created_at");
  fail(assignmentsError);

  const [teachersResult, villagesResult] = await Promise.all([
    majlissDb.from("majliss_teachers").select("*").eq("organization_id", organization!.id),
    majlissDb.from("majliss_villages").select("*").eq("organization_id", organization!.id),
  ]);
  fail(teachersResult.error);
  fail(villagesResult.error);

  const teachers = new Map((teachersResult.data ?? []).map((item) => [item.id, item]));
  const villages = new Map((villagesResult.data ?? []).map((item) => [item.id, item]));
  const resolved = (assignments ?? []).flatMap((assignment) => {
    const teacher = teachers.get(assignment.teacher_id);
    const village = villages.get(assignment.village_id);
    return teacher && village ? [{ ...assignment, teacher, village }] : [];
  }) as AssignmentOption[];
  const flags = organization?.feature_flags as Record<string, unknown> | null;

  return {
    enabled: flags?.majliss_ingestion_v1 === true,
    userId: authData.user.id,
    assignments: resolved,
  };
}

async function fingerprint(file: File) {
  const windowSize = 64 * 1024;
  const head = await file.slice(0, windowSize).arrayBuffer();
  const tail = await file.slice(Math.max(0, file.size - windowSize)).arrayBuffer();
  const identity = new TextEncoder().encode(`${file.size}:`);
  const joined = new Uint8Array(identity.length + head.byteLength + tail.byteLength);
  joined.set(identity);
  joined.set(new Uint8Array(head), identity.length);
  joined.set(new Uint8Array(tail), identity.length + head.byteLength);
  const digest = await crypto.subtle.digest("SHA-256", joined);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(-120);
}

function uploadOriginal(
  file: File,
  objectName: string,
  token: string,
  onProgress: (value: number) => void,
) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!supabaseUrl || !publishableKey) throw new Error("Configuration Supabase indisponible.");
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];

  return new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`,
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: publishableKey,
        "x-upsert": "true",
      },
      metadata: {
        bucketName: BUCKET,
        objectName,
        contentType: mimeFor(file),
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      onError: reject,
      onProgress: (sent, total) => onProgress(total ? Math.round((sent / total) * 100) : 0),
      onSuccess: () => resolve(),
    });
    void upload.findPreviousUploads().then((previous) => {
      if (previous[0]) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    });
  });
}

export async function uploadMajlissAudio(input: {
  uploadId: string;
  file: File;
  title?: string;
  recordedOn?: string;
  durationSeconds?: number;
  orderIndex: number;
  destination: MajlissUploadDestination;
  onProgress: (value: number) => void;
}) {
  validateAudioFile(input.file);
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  fail(sessionError);
  const session = sessionData.session;
  if (!session) throw new Error("Session expirée. Reconnectez-vous.");

  const contentFingerprint = await fingerprint(input.file);
  const isAssistant = Boolean(input.destination.assignmentId);
  const slug = `${isAssistant ? "assistant" : "whatsapp"}-${input.uploadId}`;
  const { data: existing, error: existingError } = await majlissDb
    .from("majliss_recordings")
    .select("id")
    .eq("organization_id", input.destination.organizationId)
    .eq("slug", slug)
    .maybeSingle();
  fail(existingError);
  if (existing) return;
  const objectName = `${input.destination.organizationId}/${input.destination.assignmentId ?? "admin"}/${session.user.id}/${input.uploadId}-${safeFileName(input.file.name)}`;
  await uploadOriginal(input.file, objectName, session.access_token, input.onProgress);

  const fallbackTitle = input.file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  const mime = mimeFor(input.file);
  const { error } = await majlissDb.from("majliss_recordings").insert({
    organization_id: input.destination.organizationId,
    village_id: input.destination.villageId,
    teacher_id: input.destination.teacherId,
    title: input.title?.trim() || fallbackTitle || "Enregistrement reçu",
    slug,
    media_type: "audio",
    media_url: `storage://${BUCKET}/${objectName}`,
    access_tier: "free",
    status: "draft",
    duration_seconds: input.durationSeconds ?? null,
    order_index: input.orderIndex,
    recorded_on: input.recordedOn || null,
    storage_bucket: BUCKET,
    storage_path: objectName,
    original_file_name: input.file.name,
    mime_type: mime,
    file_size_bytes: input.file.size,
    received_at: new Date().toISOString(),
    review_status: "pending",
    upload_source: isAssistant ? "assistant_upload" : "whatsapp_import",
    uploaded_by: session.user.id,
    content_fingerprint: contentFingerprint,
    processing_status: ["audio/mpeg", "audio/mp4", "audio/x-m4a"].includes(mime)
      ? "ready"
      : "needs_normalization",
    created_by: session.user.id,
    source_metadata: { client: "karanta-web", original_preserved: true },
  });
  if (error?.code === "23505") {
    const { data: retried, error: retryError } = await majlissDb
      .from("majliss_recordings")
      .select("id")
      .eq("organization_id", input.destination.organizationId)
      .eq("slug", slug)
      .maybeSingle();
    fail(retryError);
    if (retried) return;
  }
  fail(error);
}

export async function uploadAssistantRecording(input: {
  uploadId: string;
  file: File;
  title?: string;
  recordedOn?: string;
  durationSeconds?: number;
  orderIndex: number;
  assignment: AssignmentOption;
  onProgress: (value: number) => void;
}) {
  return uploadMajlissAudio({
    ...input,
    destination: {
      organizationId: input.assignment.organization_id,
      villageId: input.assignment.village_id,
      teacherId: input.assignment.teacher_id,
      assignmentId: input.assignment.id,
    },
  });
}
