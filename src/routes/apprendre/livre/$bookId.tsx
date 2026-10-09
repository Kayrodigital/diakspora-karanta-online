import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";

import {
  CatalogState,
  ChapterList,
  EmptyState,
  LearningShell,
} from "@/features/learning/LearningUi";
import { summarizeProgress } from "@/features/learning/progress-data";
import {
  findLearningTrail,
  nextSessionForBook,
  sessionsForBook,
  useLearningCatalog,
} from "@/features/learning/learning-hooks";

export const Route = createFileRoute("/apprendre/livre/$bookId")({
  ssr: false,
  component: BookPage,
});

function BookPage() {
  const { bookId } = Route.useParams();
  const query = useLearningCatalog();
  return (
    <CatalogState query={query} variant="heritage">
      {(catalog) => {
        const { subject, book } = findLearningTrail(catalog, { bookId });
        if (!book || !subject)
          return (
            <LearningShell variant="heritage">
              <div className="mx-auto max-w-3xl px-6 py-20">
                <EmptyState
                  title="Livre introuvable"
                  description="Ce livre n’est pas publié ou n’existe plus."
                  action={
                    <Link
                      to="/apprendre"
                      className="font-bold text-[var(--learning-green)] underline underline-offset-4"
                    >
                      Revenir au catalogue
                    </Link>
                  }
                />
              </div>
            </LearningShell>
          );

        const chapters = [...catalog.chapters]
          .filter((chapter) => chapter.book_id === book.id)
          .sort((left, right) => left.order_index - right.order_index);
        const orderedSessions = sessionsForBook(catalog, book.id);
        const bookProgress = summarizeProgress(
          catalog.progress,
          orderedSessions.map((session) => session.id),
        );
        const nextSession = nextSessionForBook(catalog, book.id);
        const nextLesson = nextSession
          ? catalog.lessons.find((lesson) => lesson.id === nextSession.lesson_id)
          : null;
        const currentChapter = nextLesson?.chapter_id
          ? chapters.find((chapter) => chapter.id === nextLesson.chapter_id)
          : null;
        const nextIndex = nextSession
          ? orderedSessions.findIndex((session) => session.id === nextSession.id)
          : -1;
        const hasStarted = orderedSessions.some((session) =>
          catalog.progress.some((item) => item.session_id === session.id),
        );

        return (
          <LearningShell variant="heritage">
            <div className="mx-auto w-full max-w-4xl px-6 pb-12 pt-7 sm:px-8 sm:pt-10 lg:px-12">
              <Link
                to="/apprendre"
                className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[var(--learning-green)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--learning-green)]"
              >
                <ArrowLeft className="size-4" aria-hidden="true" /> Retour aux livres
              </Link>

              <section className="mt-4 rounded-[14px] bg-[var(--learning-sand)] p-4 sm:p-6">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#6b765f]">
                  {subject.name}
                </p>
                <h1 className="mt-2 text-[1.75rem] font-extrabold leading-tight text-[var(--learning-green)] sm:text-4xl">
                  {book.title}
                </h1>
                {book.description ? (
                  <p className="mt-2 max-w-xl text-sm leading-5 text-[#536c61]">
                    {book.description}
                  </p>
                ) : null}
                {orderedSessions.length ? (
                  <div className="mt-3">
                    <p className="text-xs font-bold text-[var(--learning-green)]">
                      {currentChapter
                        ? currentChapter.title.replace(/^Chapitre\s+\d+\s*[—-]\s*/i, "")
                        : bookProgress.completed === bookProgress.total
                          ? "Parcours terminé"
                          : "Prêt à commencer"}
                    </p>
                    <div
                      className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--learning-track)]"
                      role="progressbar"
                      aria-label={`${bookProgress.completed} cours achevés sur ${bookProgress.total}`}
                      aria-valuemin={0}
                      aria-valuemax={bookProgress.total}
                      aria-valuenow={bookProgress.completed}
                    >
                      <div
                        className="h-full rounded-full bg-[var(--learning-green)]"
                        style={{ width: `${bookProgress.percent}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </section>

              {nextSession && nextIndex >= 0 ? (
                <Link
                  to="/apprendre/seance/$sessionId"
                  params={{ sessionId: nextSession.id }}
                  className="group mt-4 flex min-h-12 items-center justify-between gap-3 rounded-xl bg-[var(--learning-green)] px-4 py-3 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--learning-gold-text)]"
                >
                  <span className="min-w-0">
                    <span className="block text-[10px] font-extrabold uppercase tracking-wide text-[#dce7df]">
                      {hasStarted ? "Reprendre mon apprentissage" : "Commencer le livre"}
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-bold">
                      Cours {String(nextIndex + 1).padStart(2, "0")} ·{" "}
                      {nextSession.title.replace(/^\d{1,3}\s*[—-]\s*/, "")}
                    </span>
                  </span>
                  <ArrowRight
                    className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              ) : null}

              <section className="mt-7" aria-labelledby="chapters-title">
                <h2
                  id="chapters-title"
                  className="text-xl font-extrabold text-[var(--learning-green)]"
                >
                  Sommaire du livre
                </h2>
                <div className="mt-4">
                  <ChapterList
                    chapters={chapters}
                    lessons={catalog.lessons}
                    sessions={catalog.sessions}
                    progress={catalog.progress}
                    variant="heritage"
                    nextSessionId={nextSession?.id}
                  />
                </div>
              </section>
            </div>
          </LearningShell>
        );
      }}
    </CatalogState>
  );
}
