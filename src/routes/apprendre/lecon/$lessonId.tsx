import { createFileRoute, Link } from "@tanstack/react-router";

import {
  CatalogState,
  EmptyState,
  LearningBreadcrumb,
  LearningShell,
  PageHeader,
  SessionCard,
} from "@/features/learning/LearningUi";
import { findLearningTrail, useLearningCatalog } from "@/features/learning/learning-hooks";

export const Route = createFileRoute("/apprendre/lecon/$lessonId")({
  ssr: false,
  component: LessonPage,
});

function LessonPage() {
  const { lessonId } = Route.useParams();
  const query = useLearningCatalog();
  return (
    <CatalogState query={query}>
      {(catalog) => {
        const { subject, book, chapter, lesson } = findLearningTrail(catalog, { lessonId });
        if (!subject || !book || !chapter || !lesson)
          return (
            <LearningShell>
              <div className="mx-auto max-w-3xl px-4 py-20">
                <EmptyState
                  title="Leçon introuvable"
                  description="Cette leçon n’est pas publiée ou n’existe plus."
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
        const sessions = catalog.sessions
          .filter((session) => session.lesson_id === lesson.id)
          .sort((a, b) => a.order_index - b.order_index);
        return (
          <LearningShell>
            <LearningBreadcrumb
              items={[
                { label: subject.name, href: `/apprendre/${subject.slug}` },
                { label: book.title, href: `/apprendre/livre/${book.id}` },
                { label: chapter.title, href: `/apprendre/chapitre/${chapter.id}` },
                { label: lesson.title },
              ]}
            />
            <PageHeader eyebrow="Leçon" title={lesson.title} description={lesson.summary} />
            <section
              className="mx-auto max-w-4xl px-4 py-10 sm:px-8 sm:py-14"
              aria-labelledby="sessions-title"
            >
              <h2
                id="sessions-title"
                className="mb-5 font-serif text-3xl font-semibold text-[#173F2B]"
              >
                Séances
              </h2>
              {sessions.length ? (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Aucune séance publiée"
                  description="La séance de cette leçon est en préparation."
                />
              )}
            </section>
          </LearningShell>
        );
      }}
    </CatalogState>
  );
}
