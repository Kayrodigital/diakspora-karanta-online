import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  FileText,
  Headphones,
  ListChecks,
  MessageCircle,
  Mic,
  PlayCircle,
} from "lucide-react";
import { z } from "zod";
import { BottomNav } from "@/features/eleve/BottomNav";
import {
  loadStudentHome,
  loadStudentLesson,
  markLessonComplete,
  submitStudentQuiz,
  type StudentLessonOutlineItem,
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

function youtubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    let videoId: string | null = null;

    if (hostname === "youtu.be") videoId = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    if (["youtube.com", "m.youtube.com"].includes(hostname)) {
      videoId =
        parsed.searchParams.get("v") ??
        (parsed.pathname.startsWith("/embed/") ? parsed.pathname.split("/")[2] : null);
    }

    return videoId && /^[a-zA-Z0-9_-]{6,}$/.test(videoId)
      ? `https://www.youtube-nocookie.com/embed/${videoId}`
      : null;
  } catch {
    return null;
  }
}

function ResourceCard({ resource }: { resource: StudentResource }) {
  const Icon = resourceIcon(resource.resource_type);
  const isAudio = resource.resource_type === "audio";
  const isVideo = resource.resource_type === "video";
  const isText = resource.resource_type === "text";
  const youtubeUrl =
    resource.resource_type === "youtube" ? youtubeEmbedUrl(resource.playbackUrl) : null;

  return (
    <article
      className={`rounded-2xl border border-[color:var(--cream-2)] bg-card p-4 shadow-[var(--shadow-card)] sm:p-5 ${youtubeUrl ? "sm:col-span-2" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--gold)]/20 text-[color:var(--gold-dark)]">
          <Icon size={21} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-sans text-base font-semibold">{resource.title}</h3>
          {resource.description ? (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{resource.description}</p>
          ) : null}
        </div>
      </div>

      {isAudio && resource.playbackUrl ? (
        <audio controls preload="metadata" className="mt-4 w-full" src={resource.playbackUrl}>
          Votre navigateur ne peut pas lire cet audio.
        </audio>
      ) : null}

      {isVideo && resource.playbackUrl ? (
        <video
          controls
          preload="metadata"
          className="mt-4 aspect-video w-full rounded-xl bg-black"
          src={resource.playbackUrl}
        >
          Votre navigateur ne peut pas lire cette vidéo.
        </video>
      ) : null}

      {youtubeUrl ? (
        <iframe
          src={youtubeUrl}
          title={resource.title}
          className="mt-4 aspect-video w-full rounded-xl bg-black"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : null}

      {isText && resource.transcript ? (
        <div className="mt-4 whitespace-pre-wrap rounded-xl bg-[color:var(--cream)] p-4 text-sm leading-7">
          {resource.transcript}
        </div>
      ) : null}

      {!isText && resource.transcript ? (
        <details className="mt-4 rounded-xl bg-[color:var(--cream)] p-4 text-sm">
          <summary className="cursor-pointer font-semibold">Lire la transcription</summary>
          <p className="mt-3 whitespace-pre-wrap leading-7">{resource.transcript}</p>
        </details>
      ) : null}

      {!isAudio && !isVideo && !youtubeUrl && resource.playbackUrl ? (
        <a
          href={resource.playbackUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[color:var(--deep-green)] px-4 font-semibold text-[color:var(--deep-green)] transition hover:bg-[color:var(--deep-green)]/5"
        >
          {resource.allow_download && resource.storage_path ? (
            <Download size={18} aria-hidden />
          ) : (
            <ExternalLink size={18} aria-hidden />
          )}
          {resource.resource_type === "document" ? "Ouvrir le document" : "Ouvrir la ressource"}
        </a>
      ) : null}

      {!resource.playbackUrl && !isText ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Cette ressource est temporairement indisponible.
        </p>
      ) : null}
    </article>
  );
}

function CourseOutline({
  items,
  currentLessonId,
}: {
  items: StudentLessonOutlineItem[];
  currentLessonId: string;
}) {
  let lastModule: string | null | undefined;

  return (
    <ol className="space-y-1.5">
      {items.map((item, index) => {
        const showModule = item.moduleTitle !== lastModule;
        lastModule = item.moduleTitle;
        const isCurrent = item.id === currentLessonId;

        return (
          <li key={item.id}>
            {showModule && item.moduleTitle ? (
              <p className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground first:mt-0">
                {item.moduleTitle}
              </p>
            ) : null}
            <Link
              to="/lecon"
              search={{ id: item.id }}
              aria-current={isCurrent ? "step" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${isCurrent ? "bg-[color:var(--deep-green)] text-white" : "text-foreground hover:bg-[color:var(--cream)]"}`}
            >
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isCurrent ? "bg-white/15 text-white" : item.completed ? "bg-emerald-100 text-emerald-700" : "bg-[color:var(--cream-2)] text-muted-foreground"}`}
              >
                {item.completed ? <Check size={14} aria-hidden /> : index + 1}
              </span>
              <span className="line-clamp-2 flex-1 font-medium leading-5">{item.title}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function LeconPage() {
  const { id } = Route.useSearch();
  const { organization, user } = Route.useRouteContext();
  const brandLogoUrl =
    organization.logo_url ||
    (organization.slug === "diakspora" ? "/brands/diakspora/logo.webp" : null);
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

  useEffect(() => {
    setAnswers({});
    setScore(null);
  }, [data.lesson.id]);

  const selectedCount = useMemo(() => Object.keys(answers).length, [answers]);
  const completedCount = useMemo(
    () => data.outline.filter((lesson) => lesson.completed).length,
    [data.outline],
  );
  const courseProgress = data.outline.length
    ? Math.round((completedCount / data.outline.length) * 100)
    : 0;

  const invalidateLearning = async () => {
    const dashboardKey = ["eleve-dashboard", organization.id, user.id] as const;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: dashboardKey, exact: true }),
      queryClient.invalidateQueries({ queryKey: ["student-lesson", organization.id] }),
    ]);
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
  const lessonFinished = data.completed || completeMutation.isSuccess || passed;
  const mutationError = completeMutation.error ?? quizMutation.error;

  return (
    <div
      className="min-h-screen bg-[color:var(--cream)] text-foreground"
      style={organizationTheme(organization)}
    >
      <header className="border-b border-[color:var(--cream-2)] bg-card/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-5 md:px-8">
          <Link to="/eleve" className="flex min-w-0 items-center gap-3">
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt="" className="h-9 w-28 object-contain object-left" />
            ) : (
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[color:var(--deep-green)] text-white">
                <BookOpen size={19} aria-hidden />
              </span>
            )}
            <span className="truncate text-sm font-semibold sm:text-base">{organization.name}</span>
          </Link>
          <Link
            to="/eleve"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-semibold text-[color:var(--deep-green)]"
          >
            <ArrowLeft size={18} aria-hidden />
            <span className="hidden sm:inline">Mes cours</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl pb-28">
        <section className="px-5 pb-7 pt-7 md:px-8 md:pt-10">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--gold-dark)]">
            {data.course ? <span>{data.course.title}</span> : null}
            {data.course ? <span aria-hidden>•</span> : null}
            <span>
              Leçon {data.lessonNumber} sur {Math.max(data.outline.length, 1)}
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <h1 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                {data.lesson.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {data.lesson.duration_minutes ? (
                  <span>Environ {data.lesson.duration_minutes} minutes</span>
                ) : null}
                <span>
                  {data.resources.length} ressource{data.resources.length > 1 ? "s" : ""}
                </span>
                {data.quiz ? <span>Évaluation incluse</span> : null}
              </div>
            </div>
            {lessonFinished ? (
              <span className="flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800">
                <Check size={14} aria-hidden /> Leçon terminée
              </span>
            ) : null}
          </div>

          <nav aria-label="Étapes de la leçon" className="mt-7 overflow-x-auto">
            <ol className="flex min-w-max items-center gap-2">
              {[
                ["01", "Apprendre", "#apprendre"],
                ["02", "Ressources", "#ressources"],
                ["03", "Vérifier", "#verifier"],
              ].map(([number, label, href]) => (
                <li key={number}>
                  <a
                    href={href}
                    className="flex min-h-10 items-center gap-2 rounded-full border border-[color:var(--cream-2)] bg-card px-3 text-sm font-semibold text-foreground transition hover:border-[color:var(--gold)]"
                  >
                    <span className="text-[10px] font-bold text-[color:var(--gold-dark)]">
                      {number}
                    </span>
                    {label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </section>

        {data.outline.length > 1 ? (
          <details className="group mx-5 mb-6 rounded-2xl border border-[color:var(--cream-2)] bg-card p-4 shadow-[var(--shadow-card)] md:mx-8 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
              <span className="flex items-center gap-2">
                <ListChecks size={19} className="text-[color:var(--deep-green)]" aria-hidden />
                Sommaire du cours
              </span>
              <ChevronDown size={18} className="transition group-open:rotate-180" aria-hidden />
            </summary>
            <div className="mt-4 border-t border-[color:var(--cream-2)] pt-3">
              <CourseOutline items={data.outline} currentLessonId={data.lesson.id} />
            </div>
          </details>
        ) : null}

        <div className="grid gap-8 px-5 md:px-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="min-w-0 space-y-10">
            <section id="apprendre" className="scroll-mt-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-[color:var(--deep-green)] text-sm font-bold text-white">
                  1
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--gold-dark)]">
                    Apprendre
                  </p>
                  <h2 className="font-serif text-2xl font-semibold">La leçon</h2>
                </div>
              </div>
              {data.lesson.video_url ? (
                <video
                  controls
                  preload="metadata"
                  src={data.lesson.video_url}
                  className="aspect-video w-full rounded-2xl bg-black shadow-[var(--shadow-card)] sm:rounded-3xl"
                >
                  Votre navigateur ne peut pas lire cette vidéo.
                </video>
              ) : null}
              {data.lesson.summary || data.course?.description ? (
                <div
                  className={`${data.lesson.video_url ? "mt-5" : ""} rounded-2xl bg-card p-5 shadow-[var(--shadow-card)] sm:p-6`}
                >
                  <h3 className="font-serif text-xl font-semibold">Ce que tu vas apprendre</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground sm:text-base">
                    {data.lesson.summary || data.course?.description}
                  </p>
                </div>
              ) : null}
            </section>

            <section id="ressources" className="scroll-mt-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-[color:var(--gold)] text-sm font-bold text-[color:var(--anthracite)]">
                    2
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--gold-dark)]">
                      Approfondir
                    </p>
                    <h2 className="font-serif text-2xl font-semibold">Ressources</h2>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{data.resources.length}</span>
              </div>
              {data.resources.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {data.resources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[color:var(--gold-dark)]/40 bg-card/50 p-5 text-sm leading-6 text-muted-foreground">
                  Le professeur n’a pas encore ajouté d’audio ou de document complémentaire.
                </div>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Link
                  to="/devoir"
                  className="flex min-h-12 items-center gap-3 rounded-2xl border border-[color:var(--cream-2)] bg-card px-4 font-semibold transition hover:border-[color:var(--deep-green)]"
                >
                  <Mic size={19} className="text-[color:var(--deep-green)]" aria-hidden />
                  Déposer un devoir
                </Link>
                <Link
                  to="/messages"
                  className="flex min-h-12 items-center gap-3 rounded-2xl border border-[color:var(--cream-2)] bg-card px-4 font-semibold transition hover:border-[color:var(--deep-green)]"
                >
                  <MessageCircle size={19} className="text-[color:var(--deep-green)]" aria-hidden />
                  Poser une question
                </Link>
              </div>
            </section>

            <section id="verifier" className="scroll-mt-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-[color:var(--anthracite)] text-sm font-bold text-white">
                  3
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--gold-dark)]">
                    Valider
                  </p>
                  <h2 className="font-serif text-2xl font-semibold">Vérifie ta maîtrise</h2>
                </div>
              </div>
              {data.quiz ? (
                <div className="rounded-3xl bg-card p-5 shadow-[var(--shadow-elegant)] sm:p-7">
                  <h3 className="font-serif text-2xl font-semibold">{data.quiz.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Réponds aux {data.quiz.questions.length} question
                    {data.quiz.questions.length > 1 ? "s" : ""}, puis valide tes réponses.
                  </p>
                  {score === null ? (
                    <div className="mt-6 space-y-7">
                      {data.quiz.questions.map((question, index) => (
                        <fieldset key={question.id}>
                          <legend className="font-semibold leading-6">
                            {index + 1}. {question.prompt}
                          </legend>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {question.options.map((option) => {
                              const selected = answers[question.id] === option.id;
                              return (
                                <label
                                  key={option.id}
                                  className={`flex min-h-13 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${selected ? "border-[color:var(--deep-green)] bg-[color:var(--deep-green)]/8" : "border-[color:var(--cream-2)] hover:border-[color:var(--gold)]"}`}
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
                        className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--deep-green)] px-5 font-bold text-white transition hover:bg-[color:var(--deep-green-hi)] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:min-w-64"
                      >
                        <ListChecks size={19} aria-hidden />
                        {quizMutation.isPending ? "Correction…" : "Valider mes réponses"}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-6 rounded-2xl bg-[color:var(--cream)] p-6 text-center">
                      <CheckCircle2
                        className={`mx-auto ${passed ? "text-emerald-600" : "text-[color:var(--gold-dark)]"}`}
                        size={46}
                        aria-hidden
                      />
                      <p className="mt-3 font-serif text-3xl font-semibold">{score}%</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {passed
                          ? "Bravo, ce point est maîtrisé."
                          : `Continue tes révisions. Il faut ${data.quiz.passingScore}% pour valider.`}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-3xl bg-card p-5 shadow-[var(--shadow-elegant)] sm:p-7">
                  <h3 className="font-serif text-2xl font-semibold">
                    La leçon est-elle comprise ?
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Quand tu as étudié le contenu et les ressources, valide cette étape pour mettre
                    à jour ta progression.
                  </p>
                  <button
                    type="button"
                    disabled={lessonFinished || completeMutation.isPending}
                    onClick={() => completeMutation.mutate()}
                    className="mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--deep-green)] px-5 font-bold text-white transition hover:bg-[color:var(--deep-green-hi)] disabled:opacity-55 sm:w-auto sm:min-w-64"
                  >
                    <Check size={19} aria-hidden />
                    {completeMutation.isPending
                      ? "Enregistrement…"
                      : lessonFinished
                        ? "Leçon terminée"
                        : "J’ai terminé cette leçon"}
                  </button>
                </div>
              )}
              {mutationError ? (
                <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">
                  {mutationError.message}
                </p>
              ) : null}
              {lessonFinished && data.nextLesson ? (
                <Link
                  to="/lecon"
                  search={{ id: data.nextLesson.id }}
                  className="mt-5 flex min-h-14 items-center justify-between gap-4 rounded-2xl bg-[color:var(--gold)] px-5 font-bold text-[color:var(--anthracite)] shadow-[var(--shadow-gold)] transition hover:bg-[color:var(--gold-soft)]"
                >
                  <span>
                    <span className="block text-[10px] uppercase tracking-[0.16em] opacity-70">
                      Étape suivante
                    </span>
                    <span className="mt-0.5 block">{data.nextLesson.title}</span>
                  </span>
                  <ArrowRight size={21} aria-hidden />
                </Link>
              ) : null}
            </section>
          </div>

          <aside className="sticky top-6 hidden lg:block">
            <section className="rounded-3xl bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--gold-dark)]">
                    Ton parcours
                  </p>
                  <h2 className="mt-1 font-serif text-xl font-semibold">Sommaire</h2>
                </div>
                <span className="text-sm font-bold text-[color:var(--deep-green)]">
                  {courseProgress}%
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--cream-2)]">
                <div
                  className="h-full rounded-full bg-[color:var(--deep-green)] transition-[width]"
                  style={{ width: `${courseProgress}%` }}
                  role="progressbar"
                  aria-label="Progression du cours"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={courseProgress}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {completedCount} leçon{completedCount > 1 ? "s" : ""} terminée
                {completedCount > 1 ? "s" : ""} sur {Math.max(data.outline.length, 1)}
              </p>
              <div className="mt-5 border-t border-[color:var(--cream-2)] pt-3">
                <CourseOutline items={data.outline} currentLessonId={data.lesson.id} />
              </div>
            </section>
          </aside>
        </div>
      </main>

      <BottomNav active="courses" />
    </div>
  );
}
