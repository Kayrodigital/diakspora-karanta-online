import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Search } from "lucide-react";
import { useState } from "react";

import {
  CatalogState,
  EmptyState,
  HeritageBookCard,
  LearningShell,
} from "@/features/learning/LearningUi";
import {
  nextSessionForBook,
  sessionsForBook,
  useLearningCatalog,
} from "@/features/learning/learning-hooks";

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

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function LearningHomePage() {
  const query = useLearningCatalog();
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("all");

  return (
    <CatalogState query={query} variant="heritage">
      {(catalog) => {
        const booksWithSessions = catalog.books.map((book) => ({
          book,
          sessions: sessionsForBook(catalog, book.id),
          subject: catalog.subjects.find((subject) => subject.id === book.subject_id),
        }));
        const visibleSubjects = catalog.subjects.filter((subject) =>
          booksWithSessions.some(({ book }) => book.subject_id === subject.id),
        );
        const normalizedSearch = normalize(search.trim());
        const filteredBooks = booksWithSessions.filter(({ book, subject }) => {
          const matchesSubject = subjectId === "all" || book.subject_id === subjectId;
          const haystack = [book.title, book.author, book.level, subject?.name]
            .filter(Boolean)
            .join(" ");
          return (
            matchesSubject && (!normalizedSearch || normalize(haystack).includes(normalizedSearch))
          );
        });
        const progressIds = new Set(catalog.progress.map((item) => item.session_id));
        const resumableBooks = booksWithSessions.filter(({ sessions }) =>
          sessions.some((session) => progressIds.has(session.id)),
        );
        const resumeBook =
          resumableBooks.find(({ sessions }) =>
            sessions.some(
              (session) =>
                catalog.progress.find((item) => item.session_id === session.id)?.status ===
                "in_progress",
            ),
          ) ?? resumableBooks[0];
        const resumeSession = resumeBook ? nextSessionForBook(catalog, resumeBook.book.id) : null;
        const resumeIndex =
          resumeBook && resumeSession
            ? resumeBook.sessions.findIndex((session) => session.id === resumeSession.id)
            : -1;

        return (
          <LearningShell variant="heritage">
            <div className="mx-auto w-full max-w-5xl px-6 pb-12 pt-8 sm:px-8 sm:pt-12 lg:px-12">
              <header>
                <h1 className="text-[1.7rem] font-extrabold leading-tight text-[var(--learning-green)] sm:text-4xl">
                  Apprendre
                </h1>
                <p className="mt-1 text-sm text-[var(--learning-muted)] sm:text-base">
                  Explorez les livres et méthodes
                </p>
              </header>

              <div className="relative mt-5">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--learning-muted)]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher un livre ou une discipline"
                  aria-label="Rechercher un livre ou une discipline"
                  className="min-h-12 w-full rounded-xl bg-[var(--learning-paper)] py-3 pl-11 pr-4 text-sm text-[var(--learning-green)] outline-none placeholder:text-[var(--learning-muted)] focus-visible:ring-2 focus-visible:ring-[var(--learning-green)]"
                />
              </div>

              {visibleSubjects.length > 1 ? (
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Disciplines">
                  <button
                    type="button"
                    aria-pressed={subjectId === "all"}
                    onClick={() => setSubjectId("all")}
                    className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold ${subjectId === "all" ? "bg-[var(--learning-green)] text-white" : "bg-[var(--learning-paper)] text-[var(--learning-green)]"}`}
                  >
                    Tous
                  </button>
                  {visibleSubjects.map((subject) => (
                    <button
                      key={subject.id}
                      type="button"
                      aria-pressed={subjectId === subject.id}
                      onClick={() => setSubjectId(subject.id)}
                      className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold ${subjectId === subject.id ? "bg-[var(--learning-green)] text-white" : "bg-[var(--learning-paper)] text-[var(--learning-green)]"}`}
                    >
                      {subject.name}
                    </button>
                  ))}
                </div>
              ) : null}

              {resumeBook && resumeSession && resumeIndex >= 0 ? (
                <section className="mt-6" aria-labelledby="resume-title">
                  <h2
                    id="resume-title"
                    className="text-lg font-extrabold text-[var(--learning-green)]"
                  >
                    Mes apprentissages
                  </h2>
                  <Link
                    to="/apprendre/seance/$sessionId"
                    params={{ sessionId: resumeSession.id }}
                    className="group mt-3 block rounded-xl bg-[var(--learning-green)] p-4 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--learning-gold-text)]"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#e8dfcd]">
                      {resumeBook.book.title}
                    </p>
                    <p className="mt-1 text-xl font-extrabold">Continuer mon étude</p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-white/90">
                      Cours {String(resumeIndex + 1).padStart(2, "0")} /{" "}
                      {resumeBook.sessions.length}
                      <span aria-hidden="true">·</span>
                      <span className="truncate">
                        {resumeSession.title.replace(/^\d{1,3}\s*[—-]\s*/, "")}
                      </span>
                      <ArrowRight
                        className="ml-auto size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </p>
                  </Link>
                </section>
              ) : null}

              <section className="mt-7" aria-labelledby="books-title">
                <h2
                  id="books-title"
                  className="text-lg font-extrabold text-[var(--learning-green)]"
                >
                  Découvrir les ouvrages
                </h2>
                {filteredBooks.length ? (
                  <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {filteredBooks.map(({ book, subject, sessions }) => (
                      <HeritageBookCard
                        key={book.id}
                        book={book}
                        subject={subject}
                        index={catalog.books.findIndex((item) => item.id === book.id)}
                        sessionCount={sessions.length}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-4">
                    <EmptyState
                      title="Aucun ouvrage trouvé"
                      description="Modifiez votre recherche ou choisissez une autre discipline."
                    />
                  </div>
                )}
              </section>
            </div>
          </LearningShell>
        );
      }}
    </CatalogState>
  );
}
