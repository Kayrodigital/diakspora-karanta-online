import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, List } from "lucide-react";

import {
  AccessBadge,
  CatalogState,
  EmptyState,
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
    <CatalogState query={query} variant="heritage">
      {(catalog) => {
        const { subject, book, chapter, lesson, session } = findLearningTrail(catalog, {
          sessionId,
        });
        if (!subject || !book || !chapter || !lesson || !session)
          return (
            <LearningShell variant="heritage">
              <div className="mx-auto max-w-3xl px-6 py-20">
                <EmptyState
                  title="Séance introuvable"
                  description="Cette séance n’est pas publiée ou n’existe plus."
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

        const orderedSessions = sessionsForBook(catalog, book.id);
        const sessionIndex = orderedSessions.findIndex((item) => item.id === session.id);
        const previousSession = sessionIndex > 0 ? orderedSessions[sessionIndex - 1] : null;
        const nextSession = sessionIndex >= 0 ? (orderedSessions[sessionIndex + 1] ?? null) : null;
        const publicTitle = session.title.replace(/^\d{1,3}\s*[—-]\s*/, "");

        return (
          <LearningShell variant="heritage">
            <div className="mx-auto w-full max-w-3xl px-6 pb-12 pt-6 sm:px-8 sm:pt-9">
              <div className="flex items-center justify-between gap-4">
                <Link
                  to="/apprendre/livre/$bookId"
                  params={{ bookId: book.id }}
                  className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[var(--learning-green)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--learning-green)]"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" /> Retour au livre
                </Link>
                <Link
                  to="/apprendre/livre/$bookId"
                  params={{ bookId: book.id }}
                  className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-[var(--learning-green)]"
                >
                  <List className="size-4" aria-hidden="true" /> Sommaire
                </Link>
              </div>

              <p className="mt-4 text-[11px] font-extrabold uppercase tracking-wide text-[var(--learning-gold-text)]">
                {subject.name} · {book.title}
              </p>
              <p className="mt-2 text-xs font-bold text-[var(--learning-muted)]">
                Cours {String(sessionIndex + 1).padStart(2, "0")} sur {orderedSessions.length}
              </p>

              <header className="mt-3 rounded-[14px] bg-[var(--learning-sand)] p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  <span
                    className="grid size-12 shrink-0 place-items-center rounded-full border border-[#d8c7a8] bg-[var(--learning-paper)] text-lg font-extrabold text-[var(--learning-green)]"
                    aria-hidden="true"
                  >
                    {String(sessionIndex + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#6b765f]">
                      {chapter.title.replace(/^Chapitre\s+\d+\s*[—-]\s*/i, "")}
                    </p>
                    <h1 className="mt-1 text-[1.65rem] font-extrabold leading-[1.12] text-[var(--learning-green)] sm:text-4xl">
                      {publicTitle}
                    </h1>
                    {session.summary ? (
                      <p className="mt-2 text-sm leading-5 text-[#536c61]">{session.summary}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--learning-muted)]">
                      {session.duration_minutes ? (
                        <span>{session.duration_minutes} min</span>
                      ) : null}
                      <AccessBadge tier={session.access_tier} />
                    </div>
                  </div>
                </div>
              </header>

              <SessionExperience
                sessionId={session.id}
                lessonId={lesson.id}
                organizationId={session.organization_id}
                requiresValidation={session.requires_validation}
                learningPoints={session.learning_points}
                reflectionQuestions={session.reflection_questions}
                variant="heritage"
              />

              <nav
                aria-label="Navigation entre les cours"
                className="mt-7 grid grid-cols-2 gap-3 border-t border-[var(--learning-border)] pt-5"
              >
                {previousSession ? (
                  <Link
                    to="/apprendre/seance/$sessionId"
                    params={{ sessionId: previousSession.id }}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--learning-green)] px-3 py-3 text-center text-xs font-bold text-[var(--learning-green)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--learning-green)]"
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" /> Cours précédent
                  </Link>
                ) : (
                  <span />
                )}
                {nextSession ? (
                  <Link
                    to="/apprendre/seance/$sessionId"
                    params={{ sessionId: nextSession.id }}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--learning-green)] px-3 py-3 text-center text-xs font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--learning-gold-text)]"
                  >
                    Cours suivant <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : null}
              </nav>
            </div>
          </LearningShell>
        );
      }}
    </CatalogState>
  );
}
