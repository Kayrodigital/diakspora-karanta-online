import { createFileRoute, Link } from "@tanstack/react-router";

import {
  AccessBadge,
  CatalogState,
  EmptyState,
  LearningBreadcrumb,
  LearningShell,
} from "@/features/learning/LearningUi";
import {
  findLearningTrail,
  sessionsForBook,
  useLearningCatalog,
} from "@/features/learning/learning-hooks";
import { SessionExperience } from "@/features/learning/SessionExperience";

export const Route = createFileRoute("/apprendre/seance/$sessionId")({
  ssr: false,
  component: SessionPage,
});

function SessionPage() {
  const { sessionId } = Route.useParams();
  const query = useLearningCatalog();
  return (
    <CatalogState query={query}>
      {(catalog) => {
        const { subject, book, chapter, lesson, session } = findLearningTrail(catalog, {
          sessionId,
        });
        if (!subject || !book || !chapter || !lesson || !session)
          return (
            <LearningShell>
              <div className="mx-auto max-w-3xl px-4 py-20">
                <EmptyState
                  title="Séance introuvable"
                  description="Cette séance n’est pas publiée ou n’existe plus."
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
        const orderedSessions = sessionsForBook(catalog, book.id);
        const sessionIndex = orderedSessions.findIndex((item) => item.id === session.id);
        const previousSession = sessionIndex > 0 ? orderedSessions[sessionIndex - 1] : null;
        const nextSession = sessionIndex >= 0 ? (orderedSessions[sessionIndex + 1] ?? null) : null;
        const publicTitle = session.title.replace(/^\d{1,3}\s*[—-]\s*/, "");
        return (
          <LearningShell>
            <LearningBreadcrumb
              items={[
                { label: subject.name, href: `/apprendre/${subject.slug}` },
                { label: book.title, href: `/apprendre/livre/${book.id}` },
                { label: chapter.title, href: `/apprendre/chapitre/${chapter.id}` },
                { label: lesson.title, href: `/apprendre/lecon/${lesson.id}` },
                { label: session.title },
              ]}
            />
            <section className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
              <header className="border-b border-[#E4D8C3] pb-6">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#9B742E]">
                  Cours {String(sessionIndex + 1).padStart(2, "0")}
                </p>
                <h1 className="mt-2 max-w-3xl font-serif text-3xl font-semibold leading-tight text-[#173F2B] sm:text-5xl">
                  {publicTitle}
                </h1>
                {session.summary ? (
                  <p className="mt-4 max-w-2xl leading-7 text-[#58605A]">{session.summary}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#686D65]">
                  {session.duration_minutes ? (
                    <span>{session.duration_minutes} minutes</span>
                  ) : null}
                  <AccessBadge tier={session.access_tier} />
                </div>
              </header>
              <SessionExperience
                sessionId={session.id}
                lessonId={lesson.id}
                organizationId={session.organization_id}
                requiresValidation={session.requires_validation}
                learningPoints={session.learning_points}
                reflectionQuestions={session.reflection_questions}
              />
              <nav
                aria-label="Navigation entre les cours"
                className="mt-10 grid grid-cols-2 gap-3 border-t border-[#E4D8C3] pt-6"
              >
                {previousSession ? (
                  <Link
                    to="/apprendre/seance/$sessionId"
                    params={{ sessionId: previousSession.id }}
                    className="min-h-12 rounded-xl border border-[#173F2B] px-4 py-3 text-center text-sm font-bold text-[#173F2B]"
                  >
                    ← Cours précédent
                  </Link>
                ) : (
                  <span />
                )}
                {nextSession ? (
                  <Link
                    to="/apprendre/seance/$sessionId"
                    params={{ sessionId: nextSession.id }}
                    className="min-h-12 rounded-xl bg-[#173F2B] px-4 py-3 text-center text-sm font-bold text-white"
                  >
                    Cours suivant →
                  </Link>
                ) : null}
              </nav>
            </section>
          </LearningShell>
        );
      }}
    </CatalogState>
  );
}
