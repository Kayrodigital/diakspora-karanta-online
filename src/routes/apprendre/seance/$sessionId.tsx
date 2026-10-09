import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Headphones, PlayCircle, Sparkles } from "lucide-react";

import {
  AccessBadge,
  CatalogState,
  EmptyState,
  LearningBreadcrumb,
  LearningShell,
} from "@/features/learning/LearningUi";
import { findLearningTrail, useLearningCatalog } from "@/features/learning/learning-hooks";

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
            <section className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
              <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(140deg,#173F2B,#356D4B)] p-6 text-white shadow-[var(--shadow-elegant)] sm:p-10">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F0D18A]">
                  Séance
                </p>
                <h1 className="mt-3 max-w-3xl font-serif text-4xl font-semibold leading-[1.05] sm:text-5xl">
                  {session.title}
                </h1>
                {session.summary ? (
                  <p className="mt-5 max-w-2xl leading-7 text-white/78">{session.summary}</p>
                ) : null}
                <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-white/80">
                  {session.duration_minutes ? (
                    <span>{session.duration_minutes} minutes</span>
                  ) : null}
                  <AccessBadge tier={session.access_tier} />
                </div>
              </div>
              <section className="mt-8" aria-labelledby="resources-title">
                <h2
                  id="resources-title"
                  className="font-serif text-3xl font-semibold text-[#173F2B]"
                >
                  Contenu de la séance
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#686D65]">
                  Les ressources seront rattachées aux séances lors de la prochaine étape
                  éditoriale.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: PlayCircle, label: "Vidéo ou audio" },
                    { icon: FileText, label: "Documents" },
                    { icon: Sparkles, label: "Exercice" },
                    { icon: Headphones, label: "Correction" },
                  ].map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex min-h-24 items-center gap-4 rounded-2xl border border-dashed border-[#CFC3AD] bg-[#FFFDF7] p-5 text-[#777A73]"
                    >
                      <Icon className="size-6 text-[#B69A67]" aria-hidden="true" />
                      <span className="font-semibold">
                        {label}
                        <span className="mt-1 block text-xs font-normal">
                          Aucun contenu disponible
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </section>
          </LearningShell>
        );
      }}
    </CatalogState>
  );
}
