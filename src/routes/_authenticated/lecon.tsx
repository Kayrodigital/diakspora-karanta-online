import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Headphones,
  PlayCircle,
} from "lucide-react";
import { z } from "zod";
import { BottomNav } from "@/features/eleve/BottomNav";
import {
  loadStudentHome,
  loadStudentLesson,
  markLessonComplete,
  submitStudentQuiz,
  type StudentResource,
} from "@/features/eleve/student-data";
import { organizationTheme } from "@/lib/organization-theme";

const searchSchema = z.object({ id: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/lecon")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Leçon — Diakspora Karanta" }] }),
  component: LeconPage,
});

function resourceIcon(type: string) {
  if (type === "audio") return Headphones;
  if (["video", "youtube", "replay"].includes(type)) return PlayCircle;
  return FileText;
}

function ResourceCard({ resource }: { resource: StudentResource }) {
  const Icon = resourceIcon(resource.resource_type);
  const isAudio = resource.resource_type === "audio";
  const isVideo = resource.resource_type === "video";
  const isText = resource.resource_type === "text";

  return (
    <article className="rounded-2xl border border-[color:var(--cream-2)] bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--gold)]/20 text-[color:var(--gold-dark)]">
          <Icon size={21} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{resource.title}</h3>
          {resource.description && (
            <p className="mt-1 text-sm text-muted-foreground">{resource.description}</p>
          )}
        </div>
      </div>

      {isAudio && resource.playbackUrl && (
        <audio controls preload="metadata" className="mt-4 w-full" src={resource.playbackUrl}>
          Votre navigateur ne peut pas lire cet audio.
        </audio>
      )}

      {isVideo && resource.playbackUrl && (
        <video
          controls
          preload="metadata"
          className="mt-4 aspect-video w-full rounded-xl bg-black"
          src={resource.playbackUrl}
        >
          Votre navigateur ne peut pas lire cette vidéo.
        </video>
      )}

      {isText && resource.transcript && (
        <div className="mt-4 whitespace-pre-wrap rounded-xl bg-[color:var(--cream)] p-4 text-sm leading-7">
          {resource.transcript}
        </div>
      )}

      {!isText && resource.transcript && (
        <details className="mt-4 rounded-xl bg-[color:var(--cream)] p-4 text-sm">
          <summary className="cursor-pointer font-semibold">Lire la transcription</summary>
          <p className="mt-3 whitespace-pre-wrap leading-7">{resource.transcript}</p>
        </details>
      )}

      {!isAudio && !isVideo && resource.playbackUrl && (
        <a
          href={resource.playbackUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[color:var(--deep-green)] px-4 font-semibold text-[color:var(--deep-green)]"
        >
          {resource.allow_download && resource.storage_path ? (
            <Download size={18} aria-hidden />
          ) : (
            <ExternalLink size={18} aria-hidden />
          )}
          {resource.resource_type === "document" ? "Ouvrir le document" : "Ouvrir la ressource"}
        </a>
      )}

      {!resource.playbackUrl && !isText && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Cette ressource est temporairement indisponible.
        </p>
      )}
    </article>
  );
}

function LeconPage() {
  const { id } = Route.useSearch();
  const { organization, user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);

  const { data } = useSuspenseQuery({
    queryKey: ["student-lesson", organization.id, user.id, id ?? "next"],
    queryFn: async () => {
      let lessonId = id;
      if (!lessonId) {
        const home = await loadStudentHome(organization.id, user.id);
        lessonId = home.nextLesson?.id;
      }
      if (!lessonId) throw new Error("Aucune leçon n’est disponible pour le moment.");
      return loadStudentLesson(organization.id, user.id, lessonId);
    },
  });

  const selectedCount = useMemo(() => Object.keys(answers).length, [answers]);
  const invalidateLearning = async () => {
    const dashboardKey = ["eleve-dashboard", organization.id, user.id] as const;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: dashboardKey, exact: true }),
      queryClient.invalidateQueries({ queryKey: ["student-lesson", organization.id] }),
    ]);
    // TanStack Router keeps the dashboard route warm while the lesson is open.
    // Refetch the inactive query now so returning to the catalog never shows stale progress.
    await queryClient.refetchQueries({ queryKey: dashboardKey, exact: true, type: "all" });
  };

  const completeMutation = useMutation({
    mutationFn: () => markLessonComplete(organization.id, user.id, data.lesson.id),
    onSuccess: invalidateLearning,
  });

  const quizMutation = useMutation({
    mutationFn: async () => {
      if (!data.quiz) throw new Error("Ce quiz n’est plus disponible.");
      return submitStudentQuiz(
        data.quiz.id,
        data.quiz.questions.map((question) => ({
          question_id: question.id,
          selected_option_ids: answers[question.id] ? [answers[question.id]] : [],
        })),
      );
    },
    onSuccess: async (result) => {
      setScore(result);
      await invalidateLearning();
    },
  });

  const quizComplete = data.quiz ? selectedCount === data.quiz.questions.length : false;
  const passed = score !== null && data.quiz ? score >= data.quiz.passingScore : false;
  const mutationError = completeMutation.error ?? quizMutation.error;

  return (
    <div
      className="min-h-screen bg-[color:var(--cream)] text-foreground"
      style={organizationTheme(organization)}
    >
      <main className="mx-auto w-full max-w-md pb-28 md:max-w-3xl lg:max-w-5xl">
        <header className="px-5 pt-6 md:px-8">
          <Link
            to="/eleve"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[color:var(--deep-green)]"
          >
            <ArrowLeft size={18} aria-hidden />
            Mes cours
          </Link>
          {data.course && (
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--gold-dark)]">
              {data.course.title}
            </p>
          )}
          <div className="mt-1 flex items-start justify-between gap-4">
            <div>
              <h1 className="font-[family-name:var(--font-display-kid)] text-3xl font-bold leading-tight md:text-4xl">
                {data.lesson.title}
              </h1>
              {data.lesson.duration_minutes && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Environ {data.lesson.duration_minutes} minutes
                </p>
              )}
            </div>
            {(data.completed || completeMutation.isSuccess || score !== null) && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">
                <Check size={14} aria-hidden /> Terminée
              </span>
            )}
          </div>
        </header>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:px-8">
          <div className="space-y-6 px-5 md:px-8 lg:px-0">
            {data.lesson.video_url && (
              <section aria-label="Vidéo de la leçon">
                <video
                  controls
                  preload="metadata"
                  src={data.lesson.video_url}
                  className="aspect-video w-full rounded-2xl bg-black shadow-[var(--shadow-card)]"
                >
                  Votre navigateur ne peut pas lire cette vidéo.
                </video>
              </section>
            )}

            {(data.lesson.summary || data.course?.description) && (
              <section className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]">
                <h2 className="font-[family-name:var(--font-display-kid)] text-xl font-bold">
                  À propos de cette leçon
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {data.lesson.summary || data.course?.description}
                </p>
              </section>
            )}

            <section>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-[family-name:var(--font-display-kid)] text-2xl font-bold">
                  Ressources du cours
                </h2>
                <span className="text-xs text-muted-foreground">
                  {data.resources.length} ressource{data.resources.length > 1 ? "s" : ""}
                </span>
              </div>
              {data.resources.length ? (
                <div className="mt-4 space-y-4">
                  {data.resources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-[color:var(--gold-dark)]/40 p-5 text-sm text-muted-foreground">
                  Le professeur n’a pas encore ajouté d’audio, de vidéo ou de document à cette
                  leçon.
                </div>
              )}
            </section>
          </div>

          <aside className="px-5 md:px-8 lg:px-0">
            {data.quiz ? (
              <section className="rounded-3xl bg-card p-5 shadow-[var(--shadow-elegant)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--gold-dark)]">
                  Vérifie tes connaissances
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-display-kid)] text-2xl font-bold">
                  {data.quiz.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Réponds à toutes les questions, puis valide tes réponses.
                </p>

                {score === null ? (
                  <div className="mt-5 space-y-6">
                    {data.quiz.questions.map((question, index) => (
                      <fieldset key={question.id}>
                        <legend className="text-sm font-semibold leading-6">
                          {index + 1}. {question.prompt}
                        </legend>
                        <div className="mt-3 space-y-2">
                          {question.options.map((option) => {
                            const selected = answers[question.id] === option.id;
                            return (
                              <label
                                key={option.id}
                                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${
                                  selected
                                    ? "border-[color:var(--deep-green)] bg-[color:var(--deep-green)]/8"
                                    : "border-[color:var(--cream-2)]"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={question.id}
                                  value={option.id}
                                  checked={selected}
                                  onChange={() =>
                                    setAnswers((current) => ({
                                      ...current,
                                      [question.id]: option.id,
                                    }))
                                  }
                                  className="h-4 w-4 accent-[color:var(--deep-green)]"
                                />
                                {option.label}
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    ))}
                    <button
                      type="button"
                      disabled={!quizComplete || quizMutation.isPending}
                      onClick={() => quizMutation.mutate()}
                      className="min-h-13 w-full rounded-2xl bg-[color:var(--deep-green)] px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {quizMutation.isPending ? "Correction…" : "Valider mes réponses"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl bg-[color:var(--cream)] p-5 text-center">
                    <CheckCircle2
                      className={`mx-auto ${passed ? "text-emerald-600" : "text-[color:var(--gold-dark)]"}`}
                      size={46}
                      aria-hidden
                    />
                    <p className="mt-3 font-[family-name:var(--font-display-kid)] text-2xl font-bold">
                      {score}%
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {passed
                        ? "Bravo, tu as validé cette leçon !"
                        : `Continue tes révisions. Il faut ${data.quiz.passingScore}% pour réussir.`}
                    </p>
                    <Link
                      to="/eleve"
                      className="mt-5 flex min-h-11 items-center justify-center rounded-xl bg-[color:var(--deep-green)] px-4 font-semibold text-white"
                    >
                      Retour à mes cours
                    </Link>
                  </div>
                )}
              </section>
            ) : (
              <section className="rounded-3xl bg-card p-5 shadow-[var(--shadow-elegant)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--gold-dark)]">
                  Progression
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-display-kid)] text-2xl font-bold">
                  Tu as terminé ?
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Après avoir écouté ou regardé les ressources, marque la leçon comme terminée.
                </p>
                <button
                  type="button"
                  disabled={
                    data.completed || completeMutation.isSuccess || completeMutation.isPending
                  }
                  onClick={() => completeMutation.mutate()}
                  className="mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--gold)] px-5 font-bold text-[color:var(--anthracite)] disabled:opacity-55"
                >
                  <Check size={19} aria-hidden />
                  {completeMutation.isPending
                    ? "Enregistrement…"
                    : data.completed || completeMutation.isSuccess
                      ? "Leçon terminée"
                      : "Marquer comme terminée"}
                </button>
              </section>
            )}

            {mutationError && (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">
                {mutationError.message}
              </p>
            )}
          </aside>
        </div>
      </main>

      <BottomNav active="courses" />
    </div>
  );
}
