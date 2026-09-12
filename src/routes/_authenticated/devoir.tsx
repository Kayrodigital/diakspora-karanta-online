import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, CheckCircle2, Clock3, Mic, Play, Send } from "lucide-react";
import { PhotoCapture } from "@/features/eleve/PhotoCapture";
import { AudioRecorder } from "@/features/eleve/AudioRecorder";
import { BottomNav } from "@/features/eleve/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { organizationTheme } from "@/lib/organization-theme";

export const Route = createFileRoute("/_authenticated/devoir")({
  head: () => ({ meta: [{ title: "Rendre un devoir — Diakspora Karanta" }] }),
  component: DevoirPage,
});

type Tab = "audio" | "photo";

async function fetchHomeworkData(organizationId: string) {
  const { data: userResult } = await supabase.auth.getUser();
  const userId = userResult.user?.id;
  if (!userId) throw new Error("Votre session a expiré.");
  const [lessonsResult, historyResult] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, title, course_id, order_index")
      .eq("organization_id", organizationId)
      .eq("status", "published")
      .order("order_index"),
    supabase
      .from("homework_submissions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (lessonsResult.error) throw lessonsResult.error;
  if (historyResult.error) throw historyResult.error;
  const history = await Promise.all(
    (historyResult.data ?? []).map(async (submission) => {
      if (!submission.file_url) return { ...submission, signedUrl: null };
      const { data } = await supabase.storage
        .from("homework")
        .createSignedUrl(submission.file_url, 3600);
      return { ...submission, signedUrl: data?.signedUrl ?? null };
    }),
  );
  return { lessons: lessonsResult.data ?? [], history };
}

async function uploadFile(organizationId: string, file: Blob, extension: string) {
  const { data: userResult } = await supabase.auth.getUser();
  const userId = userResult.user?.id;
  if (!userId) throw new Error("Votre session a expiré.");
  const path = `${organizationId}/${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("homework").upload(path, file, {
    contentType: file.type.split(";")[0] || undefined,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

async function insertSubmission(input: {
  organizationId: string;
  fileUrl: string;
  type: "photo" | "audio";
  lessonId: string | null;
  durationSeconds?: number;
  notes?: string;
}) {
  const { data: userResult } = await supabase.auth.getUser();
  const userId = userResult.user?.id;
  if (!userId) throw new Error("Votre session a expiré.");
  const { error } = await supabase.from("homework_submissions").insert({
    organization_id: input.organizationId,
    user_id: userId,
    type: input.type,
    file_url: input.fileUrl,
    lesson_id: input.lessonId,
    duration_seconds: input.durationSeconds,
    notes: input.notes?.trim() || null,
    status: "submitted",
  });
  if (error) throw error;
}

function statusLabel(status: string) {
  if (status === "graded") return "Corrigé";
  if (status === "in_review") return "En écoute";
  if (status === "resubmit_requested") return "À refaire";
  return "Envoyé";
}

function DevoirPage() {
  const { organization } = Route.useRouteContext();
  const [tab, setTab] = useState<Tab>("audio");
  const [lessonId, setLessonId] = useState("");
  const [notes, setNotes] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const homework = useQuery({
    queryKey: ["homework", organization.id],
    queryFn: () => fetchHomeworkData(organization.id),
  });

  useEffect(() => {
    if (!sent) return;
    const timer = setTimeout(() => setSent(null), 3500);
    return () => clearTimeout(timer);
  }, [sent]);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["homework", organization.id] });
  }

  async function handlePhotos(files: File[]) {
    setError(null);
    try {
      for (const file of files) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = await uploadFile(organization.id, file, extension);
        await insertSubmission({
          organizationId: organization.id,
          fileUrl: path,
          type: "photo",
          lessonId: lessonId || null,
          notes,
        });
      }
      setNotes("");
      setSent(`${files.length} photo(s) envoyée(s) au professeur`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erreur d’envoi");
    }
  }

  async function handleAudio(blob: Blob | null, durationSeconds: number) {
    setError(null);
    if (!blob) {
      setError("Le micro n’est pas disponible. Autorisez-le puis recommencez.");
      return;
    }
    try {
      const mime = blob.type.split(";")[0];
      const extension = mime === "audio/mp4" ? "m4a" : mime.split("/")[1] || "webm";
      const path = await uploadFile(organization.id, blob, extension);
      await insertSubmission({
        organizationId: organization.id,
        fileUrl: path,
        type: "audio",
        lessonId: lessonId || null,
        durationSeconds,
        notes,
      });
      setNotes("");
      setSent("Enregistrement envoyé au professeur");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erreur d’envoi");
      throw cause;
    }
  }

  const lessonNames = new Map(
    (homework.data?.lessons ?? []).map((lesson) => [lesson.id, lesson.title]),
  );

  return (
    <div
      className="min-h-screen bg-[color:var(--cream)] text-foreground"
      style={organizationTheme(organization)}
    >
      <div className="mx-auto w-full max-w-md pb-28 md:max-w-3xl lg:max-w-5xl">
        <header className="px-5 pt-6 md:px-8">
          <Link
            to="/eleve"
            className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            ← Retour
          </Link>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--gold-dark)]">
            Pratique et récitation
          </p>
          <h1 className="font-[family-name:var(--font-display-kid)] text-2xl font-bold leading-tight">
            Envoyer mon devoir
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Enregistre ta voix, réécoute-toi puis envoie ton travail à ton professeur.
          </p>
        </header>

        <section className="mx-5 mt-5 rounded-3xl border border-[color:var(--cream-2)] bg-card p-4 shadow-[var(--shadow-card)] md:mx-8 md:p-5">
          <label htmlFor="lesson" className="text-sm font-bold text-[color:var(--deep-green)]">
            Leçon concernée
          </label>
          <select
            id="lesson"
            value={lessonId}
            onChange={(event) => setLessonId(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-[color:var(--cream-2)] bg-background px-3 text-sm"
          >
            <option value="">Devoir général</option>
            {(homework.data?.lessons ?? []).map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.title}
              </option>
            ))}
          </select>
          <label
            htmlFor="notes"
            className="mt-4 block text-sm font-bold text-[color:var(--deep-green)]"
          >
            Message au professeur{" "}
            <span className="font-normal text-muted-foreground">(facultatif)</span>
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Ex. Je bloque sur la prononciation de ce passage."
            className="mt-2 w-full resize-none rounded-xl border border-[color:var(--cream-2)] bg-background p-3 text-sm"
          />
        </section>

        <div
          role="tablist"
          className="mx-5 mt-5 grid grid-cols-2 rounded-2xl bg-[color:var(--cream-2)] p-1 md:mx-8"
        >
          {(["audio", "photo"] as const).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl font-[family-name:var(--font-display-kid)] font-bold ${tab === value ? "bg-[color:var(--deep-green)] text-[color:var(--cream)]" : "text-[color:var(--anthracite)]"}`}
            >
              {value === "audio" ? <Mic size={18} /> : <Camera size={18} />}
              {value === "audio" ? "Ma voix" : "Photo"}
            </button>
          ))}
        </div>

        {sent ? (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-2xl border border-[color:var(--gold)] bg-[color:var(--gold)]/15 px-4 py-3 text-sm font-semibold text-[color:var(--deep-green)] md:mx-8">
            <Send size={16} aria-hidden /> {sent}
          </div>
        ) : null}
        {error ? (
          <div
            role="alert"
            className="mx-5 mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive md:mx-8"
          >
            {error}
          </div>
        ) : null}

        <section className="mt-6 px-5 md:px-8">
          {tab === "audio" ? (
            <AudioRecorder onSend={handleAudio} />
          ) : (
            <PhotoCapture onSend={handlePhotos} />
          )}
        </section>

        <section className="mt-10 px-5 md:px-8">
          <h2 className="font-[family-name:var(--font-display-kid)] text-xl font-bold">
            Mes envois
          </h2>
          {homework.isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Chargement…</p>
          ) : null}
          {homework.data?.history.length ? (
            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {homework.data.history.map((submission) => {
                const graded = submission.status === "graded";
                return (
                  <li
                    key={submission.id}
                    className="rounded-2xl border border-[color:var(--cream-2)] bg-card p-4 shadow-[var(--shadow-card)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[color:var(--cream-2)] text-[color:var(--deep-green)]">
                        {submission.type === "audio" ? <Mic size={22} /> : <Camera size={22} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-[family-name:var(--font-display-kid)] font-bold">
                          {submission.lesson_id
                            ? lessonNames.get(submission.lesson_id) || "Leçon"
                            : "Devoir général"}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock3 size={12} />{" "}
                          {new Date(submission.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${graded ? "bg-[color:var(--deep-green)] text-white" : "bg-[color:var(--gold)]/25 text-[color:var(--gold-dark)]"}`}
                      >
                        {statusLabel(submission.status)}
                      </span>
                    </div>
                    {submission.signedUrl && submission.type === "audio" ? (
                      <audio
                        controls
                        preload="none"
                        src={submission.signedUrl}
                        className="mt-4 w-full"
                        aria-label="Écouter mon devoir"
                      />
                    ) : submission.signedUrl ? (
                      <a
                        href={submission.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 flex min-h-10 items-center justify-center gap-2 rounded-xl bg-muted text-sm font-semibold"
                      >
                        <Play size={15} /> Voir mon envoi
                      </a>
                    ) : null}
                    {submission.feedback_text ? (
                      <div className="mt-4 rounded-xl bg-[color:var(--deep-green)]/8 p-3 text-sm">
                        <p className="flex items-center gap-1.5 font-bold text-[color:var(--deep-green)]">
                          <CheckCircle2 size={15} /> Retour du professeur
                        </p>
                        <p className="mt-1 leading-5">{submission.feedback_text}</p>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : !homework.isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Aucun devoir envoyé pour l’instant.
            </p>
          ) : null}
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
