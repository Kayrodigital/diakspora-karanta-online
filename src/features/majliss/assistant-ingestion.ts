import { Upload } from "tus-js-client";

import { supabase } from "@/integrations/supabase/client";
import {
  majlissDb,
  type MajlissTeacherAssignment,
  type MajlissTeacher,
  type MajlissVillage,
} from "./majliss-data";

const BUCKET = "majliss-ingestion";
const ACCEPTED_EXTENSIONS = ["opus", "ogg", "m4a", "mp3", "aac", "wav"];
const ACCEPTED_MIMES = new Set([
  "audio/opus",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/mpeg",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
]);

export type AssignmentOption = MajlissTeacherAssignment & {
  teacher: MajlissTeacher;
  village: MajlissVillage;
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

function extensionOf(name: string) {
  return name.toLowerCase().split(".").pop() ?? "";
}

export function validateAudioFile(file: File) {
  if (!ACCEPTED_EXTENSIONS.includes(extensionOf(file.name))) {
    throw new Error(`${file.name} : format non pris en charge.`);
  }
  if (file.type && !ACCEPTED_MIMES.has(file.type)) {
    throw new Error(`${file.name} : type audio non reconnu (${file.type}).`);
  }
  if (file.size <= 0 || file.size > 500 * 1024 * 1024) {
    throw new Error(`${file.name} : fichier vide ou supérieur à 500 Mo.`);
  }
}

function mimeFor(file: File) {
  if (file.type) return file.type;
  const ext = extensionOf(file.name);
  return ext === "mp3" ? "audio/mpeg" : ext === "m4a" ? "audio/mp4" : `audio/${ext}`;
}

async function fingerprint(file: File) {
  const windowSize = 64 * 1024;
  const head = await file.slice(0, windowSize).arrayBuffer();
  const tail = await file.slice(Math.max(0, file.size - windowSize)).arrayBuffer();
  const identity = new TextEncoder().encode(`${file.size}:${file.lastModified}:`);
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
      headers: { Authorization: `Bearer ${token}`, apikey: publishableKey },
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

export async function uploadAssistantRecording(input: {
  file: File;
  title?: string;
  recordedOn?: string;
  assignment: AssignmentOption;
  onProgress: (value: number) => void;
}) {
  validateAudioFile(input.file);
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  fail(sessionError);
  const session = sessionData.session;
  if (!session) throw new Error("Session expirée. Reconnectez-vous.");

  const fileId = crypto.randomUUID();
  const objectName = `${input.assignment.organization_id}/${input.assignment.id}/${session.user.id}/${fileId}-${safeFileName(input.file.name)}`;
  const contentFingerprint = await fingerprint(input.file);
  await uploadOriginal(input.file, objectName, session.access_token, input.onProgress);

  const fallbackTitle = input.file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  const mime = mimeFor(input.file);
  const { error } = await majlissDb.from("majliss_recordings").insert({
    organization_id: input.assignment.organization_id,
    village_id: input.assignment.village_id,
    teacher_id: input.assignment.teacher_id,
    title: input.title?.trim() || fallbackTitle || "Enregistrement reçu",
    slug: `assistant-${fileId}`,
    media_type: "audio",
    media_url: `storage://${BUCKET}/${objectName}`,
    access_tier: "free",
    status: "draft",
    recorded_on: input.recordedOn || null,
    storage_bucket: BUCKET,
    storage_path: objectName,
    original_file_name: input.file.name,
    mime_type: mime,
    file_size_bytes: input.file.size,
    received_at: new Date().toISOString(),
    review_status: "pending",
    upload_source: "assistant_upload",
    uploaded_by: session.user.id,
    content_fingerprint: contentFingerprint,
    processing_status: ["audio/mpeg", "audio/mp4", "audio/x-m4a"].includes(mime)
      ? "ready"
      : "needs_normalization",
    created_by: session.user.id,
    source_metadata: { client: "karanta-web", original_preserved: true },
  });
  fail(error);
}
