import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";

import {
  CatalogState,
  ChapterList,
  EmptyState,
  LearningBreadcrumb,
  LearningShell,
} from "@/features/learning/LearningUi";
import { ProgressBar } from "@/features/learning/ProgressUi";
import { summarizeProgress } from "@/features/learning/progress-data";
import { findLearningTrail, useLearningCatalog } from "@/features/learning/learning-hooks";

export const Route = createFileRoute("/apprendre/livre/$bookId")({
  ssr: false,
  component: BookPage,
});

function BookPage() {
  const { bookId } = Route.useParams();
  const query = useLearningCatalog();
  return (
    <CatalogState query={query}>
      {(catalog) => {
        const { subject, book } = findLearningTrail(catalog, { bookId });
        if (!book || !subject)
          return (
            <LearningShell>
              <div className="mx-auto max-w-3xl px-4 py-20">
                <EmptyState
                  title="Livre introuvable"
                  description="Ce livre n’est pas publié ou n’existe plus."
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
        const chapters = catalog.chapters
          .filter((chapter) => chapter.book_id === book.id)
          .sort((a, b) => a.order_index - b.order_index);
        const chapterIds = new Set(chapters.map((chapter) => chapter.id));
        const lessonIds = new Set(
          catalog.lessons
            .filter((lesson) => lesson.chapter_id && chapterIds.has(lesson.chapter_id))
            .map((lesson) => lesson.id),
        );
        const bookProgress = summarizeProgress(
          catalog.progress,
          catalog.sessions
            .filter((session) => lessonIds.has(session.lesson_id))
            .map((session) => session.id),
        );
        return (
          <LearningShell>
            <LearningBreadcrumb
              items={[
                { label: subject.name, href: `/apprendre/${subject.slug}` },
                { label: book.title },
              ]}
            />
            <section className="mx-auto grid max-w-7xl gap-7 px-4 pt-8 sm:px-8 md:grid-cols-[13rem_1fr] lg:px-12">
              <div className="aspect-[4/5] overflow-hidden rounded-3xl bg-[#E9DFC9] shadow-[0_20px_45px_rgba(54,45,28,0.15)]">
                {book.cover_url ? (
                  <img src={book.cover_url} alt="" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center">
                    <BookOpen className="size-12 text-[#9B855E]" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="self-center">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B56E26]">
                  Livre · Méthode
                </p>
                <h1 className="mt-3 font-serif text-4xl font-semibold leading-[1.05] text-[#173F2B] sm:text-5xl">
                  {book.title}
                </h1>
                {book.author ? (
                  <p className="mt-3 font-semibold text-[#555B54]">Par {book.author}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {book.level ? (
                    <span className="rounded-full bg-[#E7F0E9] px-3 py-1.5 text-xs font-bold text-[#24613F]">
                      {book.level}
                    </span>
                  ) : null}
                </div>
                {book.description ? (
                  <p className="mt-5 max-w-2xl text-base leading-7 text-[#62675F]">
                    {book.description}
                  </p>
                ) : null}
                {catalog.progressEnabled && bookProgress.total ? (
                  <div className="mt-6 max-w-md">
                    <ProgressBar
                      value={bookProgress.percent}
                      label={`${bookProgress.completed}/${bookProgress.total} séances terminées`}
                    />
                  </div>
                ) : null}
              </div>
            </section>
            <section
              className="mx-auto max-w-5xl px-4 py-12 sm:px-8 sm:py-16"
              aria-labelledby="chapters-title"
            >
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B56E26]">
                    Sommaire
                  </p>
                  <h2
                    id="chapters-title"
                    className="mt-2 font-serif text-3xl font-semibold text-[#173F2B]"
                  >
                    Chapitres et leçons
                  </h2>
                </div>
                <p className="text-sm text-[#72776F]">
                  {chapters.length} {chapters.length > 1 ? "chapitres" : "chapitre"}
                </p>
              </div>
              <ChapterList
                chapters={chapters}
                lessons={catalog.lessons}
                sessions={catalog.sessions}
                progress={catalog.progress}
              />
            </section>
          </LearningShell>
        );
      }}
    </CatalogState>
  );
}
