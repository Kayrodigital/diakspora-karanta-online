import { createFileRoute, Link } from "@tanstack/react-router";

import {
  CatalogState,
  EmptyState,
  LearningBreadcrumb,
  LearningShell,
  LessonCard,
  PageHeader,
} from "@/features/learning/LearningUi";
import { ProgressBar } from "@/features/learning/ProgressUi";
import { summarizeProgress } from "@/features/learning/progress-data";
import { findLearningTrail, useLearningCatalog } from "@/features/learning/learning-hooks";

export const Route = createFileRoute("/apprendre/chapitre/$chapterId")({
  ssr: false,
  component: ChapterPage,
});

function ChapterPage() {
  const { chapterId } = Route.useParams();
  const query = useLearningCatalog();
  return (
    <CatalogState query={query}>
      {(catalog) => {
        const { subject, book, chapter } = findLearningTrail(catalog, { chapterId });
        if (!subject || !book || !chapter)
          return (
            <LearningShell>
              <div className="mx-auto max-w-3xl px-4 py-20">
                <EmptyState
                  title="Chapitre introuvable"
                  description="Ce chapitre n’est pas publié ou n’existe plus."
                  action={
                    <Link
                      to="/apprendre"
                      className="font-bold text-[#173F2B] underline underline-offset-4"
                    >
                      Revenir au catalogue
                    </Link>
                  }
                />
              </div>
            </LearningShell>
          );
        const lessons = catalog.lessons
          .filter((lesson) => lesson.chapter_id === chapter.id)
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
        const lessonIds = new Set(lessons.map((lesson) => lesson.id));
        const chapterSessions = catalog.sessions.filter((session) =>
          lessonIds.has(session.lesson_id),
        );
        const chapterProgress = summarizeProgress(
          catalog.progress,
          chapterSessions.map((session) => session.id),
        );
        return (
          <LearningShell>
            <LearningBreadcrumb
              items={[
                { label: subject.name, href: `/apprendre/${subject.slug}` },
                { label: book.title, href: `/apprendre/livre/${book.id}` },
                { label: chapter.title },
              ]}
            />
            <PageHeader
              eyebrow="Chapitre"
              title={chapter.title}
              description={chapter.description}
            />
            <section className="mx-auto max-w-4xl space-y-3 px-4 py-10 sm:px-8 sm:py-14">
              {catalog.progressEnabled && chapterProgress.total ? (
                <div className="mb-6 rounded-2xl border border-[#DED3BF] bg-white p-4">
                  <ProgressBar
                    value={chapterProgress.percent}
                    label={`${chapterProgress.completed}/${chapterProgress.total} séances terminées`}
                  />
                </div>
              ) : null}
              {lessons.length ? (
                lessons.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    sessionCount={
                      catalog.sessions.filter((session) => session.lesson_id === lesson.id).length
                    }
                    completedCount={
                      summarizeProgress(
                        catalog.progress,
                        catalog.sessions
                          .filter((session) => session.lesson_id === lesson.id)
                          .map((session) => session.id),
                      ).completed
                    }
                  />
                ))
              ) : (
                <EmptyState
                  title="Aucune leçon publiée"
                  description="Les leçons de ce chapitre sont en préparation."
                />
              )}
            </section>
          </LearningShell>
        );
      }}
    </CatalogState>
  );
}
