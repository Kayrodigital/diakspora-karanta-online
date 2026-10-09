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

export function sessionsForBook(catalog: LearningCatalog, bookId: string) {
  const chapterIds = new Set(
    catalog.chapters.filter((chapter) => chapter.book_id === bookId).map((chapter) => chapter.id),
  );
  const lessonIds = new Set(
    catalog.lessons
      .filter((lesson) => Boolean(lesson.chapter_id && chapterIds.has(lesson.chapter_id)))
      .map((lesson) => lesson.id),
  );
  return catalog.sessions
    .filter((session) => lessonIds.has(session.lesson_id))
    .sort((left, right) => left.order_index - right.order_index || left.id.localeCompare(right.id));
}

export function nextSessionForBook(catalog: LearningCatalog, bookId: string) {
  const orderedSessions = sessionsForBook(catalog, bookId);
  const statusBySession = new Map(
    catalog.progress.map((item) => [item.session_id, item.status] as const),
  );
  return (
    orderedSessions.find((session) => statusBySession.get(session.id) === "in_progress") ??
    orderedSessions.find((session) => {
      const status = statusBySession.get(session.id);
      return status !== "completed" && status !== "validated";
    }) ??
    null
  );
}
