import { createFileRoute } from "@tanstack/react-router";

import {
  CatalogState,
  EmptyState,
  LearningCard,
  LearningShell,
  PageHeader,
} from "@/features/learning/LearningUi";
import { useLearningCatalog } from "@/features/learning/learning-hooks";

export const Route = createFileRoute("/apprendre/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Apprendre — Diakspora Karanta" },
      {
        name: "description",
        content: "Explorez les disciplines, livres et méthodes publiés par Diakspora Karanta.",
      },
    ],
  }),
  component: LearningHomePage,
});

function LearningHomePage() {
  const query = useLearningCatalog();
  return (
    <CatalogState query={query}>
      {(catalog) => (
        <LearningShell>
          <PageHeader
            eyebrow="Catalogue pédagogique"
            title="Qu’allez-vous apprendre aujourd’hui ?"
            description="Choisissez une discipline, puis avancez livre après livre, chapitre après chapitre."
          />
          <section
            className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-14 lg:px-12"
            aria-labelledby="disciplines-title"
          >
            <h2 id="disciplines-title" className="sr-only">
              Disciplines publiées
            </h2>
            {catalog.subjects.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {catalog.subjects.map((subject) => {
                  const books = catalog.books.filter((book) => book.subject_id === subject.id);
                  return (
                    <LearningCard
                      key={subject.id}
                      subject={subject}
                      bookCount={books.length}
                      cover={books.find((book) => book.cover_url)?.cover_url}
                    />
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Aucune discipline publiée"
                description="Le catalogue est en cours de préparation."
              />
            )}
          </section>
        </LearningShell>
      )}
    </CatalogState>
  );
}
