import { useQuery } from "@tanstack/react-query";

import { loadLearningCatalog, type LearningCatalog } from "./learning-data";

export function useLearningCatalog() {
  return useQuery({
    queryKey: ["public-learning-catalog", "diakspora"],
    queryFn: () => loadLearningCatalog(),
    staleTime: 60_000,
  });
}

export function findLearningTrail(
  catalog: LearningCatalog,
  input: {
    subjectSlug?: string;
    bookId?: string;
    chapterId?: string;
    lessonId?: string;
    sessionId?: string;
  },
) {
  const session = input.sessionId
    ? catalog.sessions.find((item) => item.id === input.sessionId)
    : undefined;
  const lessonId = input.lessonId ?? session?.lesson_id;
  const lesson = lessonId ? catalog.lessons.find((item) => item.id === lessonId) : undefined;
  const chapterId = input.chapterId ?? lesson?.chapter_id ?? undefined;
  const chapter = chapterId ? catalog.chapters.find((item) => item.id === chapterId) : undefined;
  const bookId = input.bookId ?? chapter?.book_id;
  const book = bookId ? catalog.books.find((item) => item.id === bookId) : undefined;
  const subject = input.subjectSlug
    ? catalog.subjects.find((item) => item.slug === input.subjectSlug)
    : catalog.subjects.find((item) => item.id === book?.subject_id);
  return { subject, book, chapter, lesson, session };
}
