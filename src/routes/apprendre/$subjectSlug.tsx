import { createFileRoute, Link } from "@tanstack/react-router";

import {
  BookCard,
  CatalogState,
  EmptyState,
  LearningBreadcrumb,
  LearningShell,
  PageHeader,
} from "@/features/learning/LearningUi";
import { findLearningTrail, useLearningCatalog } from "@/features/learning/learning-hooks";

export const Route = createFileRoute("/apprendre/$subjectSlug")({
  ssr: false,
  component: SubjectPage,
});

function SubjectPage() {
  const { subjectSlug } = Route.useParams();
  const query = useLearningCatalog();
  return (
    <CatalogState query={query}>
      {(catalog) => {
        const { subject } = findLearningTrail(catalog, { subjectSlug });
        if (!subject)
          return (
            <LearningShell>
              <div className="mx-auto max-w-3xl px-4 py-20">
                <EmptyState
                  title="Discipline introuvable"
                  description="Cette discipline n’est pas publiée ou n’existe plus."
                  action={
                    <Link
                      to="/apprendre"
                      className="font-bold text-[#173F2B] underline underline-offset-4"
                    >
                      Revenir à Apprendre
                    </Link>
                  }
                />
              </div>
            </LearningShell>
          );
        const books = catalog.books.filter((book) => book.subject_id === subject.id);
        return (
          <LearningShell>
            <LearningBreadcrumb items={[{ label: subject.name }]} />
            <PageHeader
              eyebrow="Discipline"
              title={subject.name}
              description={subject.description}
            />
            <section
              className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-14 lg:px-12"
              aria-label={`Livres et méthodes — ${subject.name}`}
            >
              {books.length ? (
                <div className="grid gap-5 lg:grid-cols-2">
                  {books.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Aucun livre publié"
                  description="Les livres et méthodes de cette discipline sont en préparation."
                />
              )}
            </section>
          </LearningShell>
        );
      }}
    </CatalogState>
  );
}
