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
  Lock,
  MessageCircle,
  Mic,
  NotebookPen,
  PlayCircle,
  Save,
} from "lucide-react";
import { z } from "zod";
import { BottomNav } from "@/features/eleve/BottomNav";
import {
  loadStudentHome,
  loadStudentLesson,
  markLessonComplete,
  saveStudentLessonNote,
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

function lessonKeyPoints(content: unknown, summary: string | null, fallback: string | null) {
  if (content && typeof content === "object" && !Array.isArray(content)) {
    const points = (content as Record<string, unknown>).key_points;
    if (Array.isArray(points)) {
      const labels = points.filter((point): point is string => typeof point === "string");
      if (labels.length) return labels;
    }
  }

  return [summary || fallback || "Découvre les notions essentielles de cette leçon."];
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
  resources,
}: {
  items: StudentLessonOutlineItem[];
  currentLessonId: string;
  resources: StudentResource[];
}) {
  let lastModule: string | null | undefined;
  const firstIncompleteIndex = items.findIndex((item) => !item.completed);
  const availableUntil = firstIncompleteIndex === -1 ? items.length - 1 : firstIncompleteIndex;

  return (
    <ol>
      {items.map((item, index) => {
        const showModule = item.moduleTitle !== lastModule;
        lastModule = item.moduleTitle;
        const isCurrent = item.id === currentLessonId;
        const isAvailable = item.completed || index <= availableUntil || isCurrent;
        const rowClass = `flex min-h-16 items-center gap-3 px-4 py-3 text-sm transition sm:px-5 ${
          isCurrent
            ? "border-l-4 border-[color:var(--gold-dark)] bg-[color:var(--gold)]/10"
            : "border-l-4 border-transparent"
        }`;
        const rowContent = (
          <>
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                isCurrent
                  ? "bg-[color:var(--gold)] text-[color:var(--anthracite)]"
                  : item.completed
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {item.completed ? (
                <Check size={16} aria-hidden />
              ) : isAvailable ? (
                <PlayCircle size={17} aria-hidden />
              ) : (
                <Lock size={15} aria-hidden />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold leading-5">{item.title}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {item.completed
                  ? "Terminée"
                  : isCurrent
                    ? "En cours"
                    : isAvailable
                      ? "Disponible"
                      : "À débloquer"}
              </span>
            </span>
            {isCurrent ? (
              <ChevronDown className="size-4 shrink-0 text-[color:var(--gold-dark)]" aria-hidden />
            ) : null}
          </>
        );

        return (
          <li key={item.id} className="border-b border-[color:var(--cream-2)] last:border-b-0">
            {showModule && item.moduleTitle ? (
              <p className="border-b border-[color:var(--cream-2)] bg-[color:var(--cream)]/70 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--deep-green)] sm:px-5">
                {item.moduleTitle}
              </p>
            ) : null}
            {isAvailable ? (
              <Link
                to="/lecon"
                search={{ id: item.id }}
                aria-current={isCurrent ? "step" : undefined}
                className={`${rowClass} hover:bg-[color:var(--cream)]`}
              >
                {rowContent}
              </Link>
            ) : (
              <div className={`${rowClass} text-muted-foreground`} aria-disabled="true">
                {rowContent}
              </div>
            )}
            {isCurrent && resources.length ? (
              <ol className="border-l border-[color:var(--gold)]/50 pb-3 pl-5 pr-4 sm:ml-9 sm:pl-6">
                {resources.map((resource, resourceIndex) => (
                  <li
                    key={resource.id}
                    className="flex min-h-10 items-center gap-2 text-xs font-medium text-muted-foreground"
                  >
                    <span className="size-2 rounded-full bg-[color:var(--gold-dark)]" aria-hidden />
                    Séance {resourceIndex + 1} — {resource.title}
                  </li>
                ))}
              </ol>
            ) : null}
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
  const [note, setNote] = useState("");
  const [learningTab, setLearningTab] = useState<"notes" | "messages">("notes");

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
    setNote(data.note);
    setLearningTab("notes");
  }, [data.lesson.id, data.note]);

  const selectedCount = useMemo(() => Object.keys(answers).length, [answers]);
  const completedCount = useMemo(
    () => data.outline.filter((lesson) => lesson.completed).length,
    [data.outline],
  );
  const courseProgress = data.outline.length
    ? Math.round((completedCount / data.outline.length) * 100)
    : 0;
  const keyPoints = lessonKeyPoints(
    data.lesson.content,
    data.lesson.summary,
    data.course?.description ?? null,
  );
  const sessionResources = data.resources.filter((resource) =>
    ["video", "youtube", "replay"].includes(resource.resource_type),
  );
  const primaryResource = sessionResources[0];
  const primaryYoutubeUrl =
    primaryResource?.resource_type === "youtube"
      ? youtubeEmbedUrl(primaryResource.playbackUrl)
      : youtubeEmbedUrl(data.lesson.video_url);
  const primaryVideoUrl = primaryYoutubeUrl
    ? null
    : primaryResource?.playbackUrl || data.lesson.video_url;
  const supportingResources = data.resources.filter(
    (resource) => resource.id !== primaryResource?.id,
  );
  const documentResources = supportingResources.filter(
    (resource) => resource.resource_type !== "audio",
  );
  const audioResources = supportingResources.filter(
    (resource) => resource.resource_type === "audio",
  );

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

  const noteMutation = useMutation({
    mutationFn: () => saveStudentLessonNote(organization.id, user.id, data.lesson.id, note),
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

      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 sm:px-6 md:px-8 md:pt-8">
        <Link
          to="/eleve"
          className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[color:var(--deep-green)]"
        >
          <ArrowLeft size={17} aria-hidden /> Retour à mes cours
        </Link>

        <section className="mt-3 border-b-2 border-[color:var(--gold)] pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[color:var(--deep-green)]">
            {data.course?.title || "Mon cours"}
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">
                Leçon {data.lessonNumber} sur {Math.max(data.outline.length, 1)}
              </p>
              <h1 className="mt-1 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
                {data.lesson.title}
              </h1>
            </div>
            {lessonFinished ? (
              <span className="flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800">
                <Check size={14} aria-hidden /> Leçon terminée
              </span>
            ) : null}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em]">
            <ListChecks size={20} className="text-emerald-600" aria-hidden /> Points abordés
          </h2>
          <ul className="mt-4 space-y-3">
            {keyPoints.map((point) => (
              <li key={point} className="flex gap-3 text-sm leading-6 sm:text-base">
                <Check className="mt-1 size-4 shrink-0 text-emerald-600" aria-hidden />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm italic text-muted-foreground">
            Les explications et les exemples sont développés dans la séance.
          </p>
        </section>

        {primaryYoutubeUrl || primaryVideoUrl ? (
          <section className="mt-6 overflow-hidden rounded-2xl bg-black shadow-[var(--shadow-elegant)] sm:rounded-3xl">
            {primaryYoutubeUrl ? (
              <iframe
                src={primaryYoutubeUrl}
                title={primaryResource?.title || data.lesson.title}
                className="aspect-video w-full"
                loading="eager"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <video
                controls
                preload="metadata"
                src={primaryVideoUrl || undefined}
                className="aspect-video w-full"
              >
                Votre navigateur ne peut pas lire cette vidéo.
              </video>
            )}
          </section>
        ) : null}

        <section className="mt-7 overflow-hidden rounded-2xl border border-[color:var(--gold)]/60 bg-card shadow-[var(--shadow-card)] sm:rounded-3xl">
          <div className="flex items-center justify-between gap-3 border-b border-[color:var(--cream-2)] px-4 py-4 sm:px-5">
            <h2 className="font-bold uppercase tracking-[0.04em]">Contenu du cours</h2>
            <span className="text-sm font-bold text-[color:var(--deep-green)]">
              {courseProgress}%
            </span>
          </div>
          <div className="h-1.5 bg-[color:var(--cream-2)]">
            <div
              className="h-full bg-[color:var(--deep-green)] transition-[width]"
              style={{ width: `${courseProgress}%` }}
              role="progressbar"
              aria-label="Progression du cours"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={courseProgress}
            />
          </div>
          <CourseOutline
            items={data.outline}
            currentLessonId={data.lesson.id}
            resources={sessionResources}
          />
        </section>

        <section className="mt-7 rounded-2xl border border-[color:var(--gold)]/50 bg-card p-4 shadow-[var(--shadow-card)] sm:rounded-3xl sm:p-5">
          <div className="flex flex-wrap gap-2" aria-label="Ressources de la leçon">
            <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[color:var(--deep-green)] px-4 text-sm font-bold text-white">
              <FileText size={16} aria-hidden /> Documents <span>{documentResources.length}</span>
            </span>
            <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[color:var(--deep-green)] px-4 text-sm font-bold text-[color:var(--deep-green)]">
              <Headphones size={16} aria-hidden /> Audios <span>{audioResources.length}</span>
            </span>
          </div>
          {supportingResources.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {supportingResources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-[color:var(--cream)] px-4 py-3 text-sm text-muted-foreground">
              Les documents et audios complémentaires seront ajoutés ici par le professeur.
            </p>
          )}
          <Link
            to="/devoir"
            className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[color:var(--deep-green)] px-4 font-semibold text-[color:var(--deep-green)]"
          >
            <Mic size={18} aria-hidden /> Déposer un devoir oral
          </Link>
        </section>

        <section className="mt-8">
          <div className="flex border-b border-[color:var(--gold)]/50" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={learningTab === "notes"}
              onClick={() => setLearningTab("notes")}
              className={`min-h-12 border-b-2 px-3 font-bold ${learningTab === "notes" ? "border-[color:var(--deep-green)] text-[color:var(--deep-green)]" : "border-transparent text-muted-foreground"}`}
            >
              Mes notes
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={learningTab === "messages"}
              onClick={() => setLearningTab("messages")}
              className={`min-h-12 border-b-2 px-3 font-bold ${learningTab === "messages" ? "border-[color:var(--deep-green)] text-[color:var(--deep-green)]" : "border-transparent text-muted-foreground"}`}
            >
              Messagerie
            </button>
          </div>

          {learningTab === "notes" ? (
            <div className="pt-5" role="tabpanel">
              <label
                htmlFor="lesson-note"
                className="flex items-center gap-2 font-bold uppercase tracking-[0.05em]"
              >
                <NotebookPen size={19} className="text-[color:var(--gold-dark)]" aria-hidden /> Mes
                notes privées
              </label>
              <textarea
                id="lesson-note"
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  noteMutation.reset();
                }}
                maxLength={10000}
                rows={7}
                placeholder="Note un détail, du vocabulaire à retenir ou une question pour plus tard…"
                className="mt-3 w-full resize-y rounded-2xl border border-[color:var(--gold)]/60 bg-card p-4 text-sm leading-6 outline-none transition focus:border-[color:var(--deep-green)] focus:ring-2 focus:ring-[color:var(--deep-green)]/15"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Ces notes ne sont visibles que par toi.
                </p>
                <button
                  type="button"
                  disabled={noteMutation.isPending}
                  onClick={() => noteMutation.mutate()}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[color:var(--deep-green)] px-4 font-bold text-white disabled:opacity-55"
                >
                  <Save size={17} aria-hidden />
                  {noteMutation.isPending
                    ? "Enregistrement…"
                    : noteMutation.isSuccess
                      ? "Notes enregistrées"
                      : "Enregistrer"}
                </button>
              </div>
              {noteMutation.isError ? (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  {noteMutation.error.message}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-card)]" role="tabpanel">
              <MessageCircle size={24} className="text-[color:var(--deep-green)]" aria-hidden />
              <h2 className="mt-3 font-serif text-xl font-semibold">Une question sur la leçon ?</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Écris à ton professeur depuis la messagerie pédagogique. La discussion restera liée
                à ton espace personnel.
              </p>
              <Link
                to="/messages"
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[color:var(--deep-green)] px-4 font-bold text-white"
              >
                Ouvrir la messagerie <ArrowRight size={17} aria-hidden />
              </Link>
            </div>
          )}
        </section>

        {!data.quiz ? (
          <button
            type="button"
            disabled={lessonFinished || completeMutation.isPending}
            onClick={() => completeMutation.mutate()}
            className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--deep-green)] px-5 font-bold text-white shadow-[var(--shadow-card)] transition hover:bg-[color:var(--deep-green-hi)] disabled:opacity-55"
          >
            <CheckCircle2 size={20} aria-hidden />
            {completeMutation.isPending
              ? "Enregistrement…"
              : lessonFinished
                ? "Leçon terminée"
                : "Marquer comme terminé"}
          </button>
        ) : null}

        {data.quiz ? (
          <section id="verifier" className="mt-10 scroll-mt-6">
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
                <h3 className="font-serif text-2xl font-semibold">La leçon est-elle comprise ?</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Quand tu as étudié le contenu et les ressources, valide cette étape pour mettre à
                  jour ta progression.
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
        ) : null}

        {mutationError && !data.quiz ? (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">
            {mutationError.message}
          </p>
        ) : null}

        {lessonFinished && data.nextLesson && !data.quiz ? (
          <Link
            to="/lecon"
            search={{ id: data.nextLesson.id }}
            className="mt-5 flex min-h-14 items-center justify-between gap-4 rounded-2xl bg-[color:var(--gold)] px-5 font-bold text-[color:var(--anthracite)] shadow-[var(--shadow-gold)]"
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
      </main>

      <BottomNav active="courses" />
    </div>
  );
}
