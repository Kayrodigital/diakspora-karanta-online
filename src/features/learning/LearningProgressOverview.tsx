import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpenCheck } from "lucide-react";
import { loadLearningCatalog } from "./learning-data";
import { ProgressBar } from "./ProgressUi";
import { summarizeProgress } from "./progress-data";

export function LearningProgressOverview({
  profileId,
  title = "Mon parcours actif",
}: {
  profileId: string;
  title?: string;
}) {
  const query = useQuery({
    queryKey: ["learning-progress-overview", profileId],
    queryFn: () => loadLearningCatalog(profileId),
  });

  if (query.isPending)
    return <div className="h-44 animate-pulse rounded-3xl bg-[color:var(--cream-2)]" />;
  if (query.isError || !query.data?.progressEnabled) return null;

  const catalog = query.data;
  const startedSessionIds = new Set(catalog.progress.map((item) => item.session_id));
  const books = catalog.books.flatMap((book) => {
    const chapterIds = new Set(
      catalog.chapters
        .filter((chapter) => chapter.book_id === book.id)
        .map((chapter) => chapter.id),
    );
    const lessonIds = new Set(
      catalog.lessons
        .filter((lesson) => lesson.chapter_id && chapterIds.has(lesson.chapter_id))
        .map((lesson) => lesson.id),
    );
    const sessions = catalog.sessions.filter((session) => lessonIds.has(session.lesson_id));
    const summary = summarizeProgress(
      catalog.progress,
      sessions.map((session) => session.id),
    );
    const started = sessions.some((session) => startedSessionIds.has(session.id));
    return started ? [{ book, sessions, summary }] : [];
  });
  const nextSession = catalog.sessions.find((session) => {
    const status = catalog.progress.find((item) => item.session_id === session.id)?.status;
    return status !== "completed" && status !== "validated";
  });

  return (
    <section
      className="rounded-3xl border border-[color:var(--cream-2)] bg-card p-5 shadow-[var(--shadow-card)] sm:p-6"
      aria-labelledby={`learning-progress-${profileId}`}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <BookOpenCheck className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`learning-progress-${profileId}`} className="font-serif text-2xl font-semibold">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Progression calculée sur les séances publiées accessibles.
          </p>
        </div>
      </div>
      {books.length ? (
        <div className="mt-5 space-y-4">
          {books.map(({ book, summary }) => (
            <div key={book.id} className="rounded-2xl bg-muted/40 p-4">
              <p className="mb-3 font-semibold">{book.title}</p>
              <ProgressBar
                value={summary.percent}
                label={`${summary.completed}/${summary.total} séances`}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
          Aucune séance commencée pour ce profil.
        </p>
      )}
      {nextSession ? (
        <a
          href={`/apprendre/seance/${nextSession.id}`}
          className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Continuer avec {nextSession.title}
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      ) : null}
    </section>
  );
}
