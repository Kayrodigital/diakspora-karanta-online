import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  GraduationCap,
  Home,
  LibraryBig,
  LockKeyhole,
  Menu,
  MessageCircleMore,
  Play,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  type LearningBook,
  type LearningCatalog,
  type LearningChapter,
  type LearningLesson,
  type LearningSession,
  type LearningSubject,
} from "./learning-data";
import { useLearningCatalog } from "./learning-hooks";
import { ProgressBadge, ProgressBar } from "./ProgressUi";
import {
  summarizeProgress,
  type SessionProgress,
  type SessionProgressStatus,
} from "./progress-data";

function sessionStatus(progress: SessionProgress[], sessionId: string): SessionProgressStatus {
  return progress.find((item) => item.session_id === sessionId)?.status ?? "not_started";
}

const navigation = [
  { label: "Accueil", href: "/", icon: Home },
  { label: "Apprendre", href: "/apprendre", icon: GraduationCap },
  { label: "Majliss", href: "/majliss", icon: MessageCircleMore },
  { label: "Boutique", href: "/boutique", icon: ShoppingBag },
  { label: "Mon espace", href: "/auth?portal=family", icon: UserRound },
];

export function LearningShell({
  children,
  active = "Apprendre",
  variant = "default",
}: {
  children: ReactNode;
  active?: "Apprendre" | "Majliss";
  variant?: "default" | "heritage";
}) {
  const heritage = variant === "heritage";
  return (
    <div
      className={`min-h-screen pb-20 md:pb-0 ${heritage ? "learning-direction-a bg-[var(--learning-ivory)]" : "bg-[color:var(--cream)] text-foreground"}`}
    >
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl ${heritage ? "border-[var(--learning-sand)] bg-[var(--learning-ivory)]/95" : "border-[#D8C8A8]/70 bg-[#FFFDF7]/95"}`}
      >
        <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8 lg:px-12">
          <Link
            to="/"
            className="flex min-h-12 items-center gap-3"
            aria-label="Accueil Diakspora Karanta"
          >
            {heritage ? (
              <span className="text-xl font-extrabold tracking-[0.04em] text-[var(--learning-green)]">
                KARANTA
              </span>
            ) : (
              <>
                <img src="/brands/diakspora/logo.webp" alt="" className="size-10 object-contain" />
                <span className="leading-none">
                  <span className="block font-serif text-xl font-semibold text-[#173F2B]">
                    Diakspora
                  </span>
                  <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#B56E26]">
                    Karanta
                  </span>
                </span>
              </>
            )}
          </Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
            {navigation.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`rounded-full px-4 py-3 text-sm font-semibold transition ${heritage ? "hover:bg-[var(--learning-sand)] hover:text-[var(--learning-green)]" : "hover:bg-[#F2E8D5] hover:text-[#173F2B]"} ${item.label === active ? (heritage ? "bg-[var(--learning-soft-green)] text-[var(--learning-green)]" : "bg-[#E6F0E8] text-[#173F2B]") : heritage ? "text-[var(--learning-muted)]" : "text-[#565C55]"}`}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <details className="group relative lg:hidden">
            <summary
              className={`grid size-11 cursor-pointer list-none place-items-center rounded-full border focus-visible:outline-2 focus-visible:outline-offset-2 ${heritage ? "border-transparent text-[var(--learning-green)] focus-visible:outline-[var(--learning-green)]" : "border-[#D8C8A8] text-[#173F2B] focus-visible:outline-[#173F2B]"}`}
            >
              <Menu className="size-5" aria-hidden="true" />
              <span className="sr-only">Ouvrir le menu</span>
            </summary>
            <nav
              className={`absolute right-0 top-14 grid w-64 gap-1 rounded-2xl border p-3 text-sm font-semibold shadow-2xl ${heritage ? "border-[var(--learning-sand)] bg-[var(--learning-paper)]" : "border-[#D8C8A8] bg-[#FFFDF7]"}`}
            >
              {navigation.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`rounded-xl px-4 py-3 ${heritage ? "hover:bg-[var(--learning-sand)]" : "hover:bg-[#F3E8D3]"}`}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </details>
        </div>
      </header>
      <main>{children}</main>
      <footer
        className={`mt-16 hidden border-t md:block ${heritage ? "border-[var(--learning-sand)] bg-[var(--learning-paper)]" : "border-[#D8C8A8]/70 bg-[#FFFDF7]"}`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-8 py-8 text-sm text-[#666A63] lg:px-12">
          <p>© 2026 Diakspora Karanta</p>
          <p>Apprendre, pratiquer et transmettre.</p>
        </div>
      </footer>
      <nav
        className={`fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-xl md:hidden ${heritage ? "border-[var(--learning-sand)] bg-[var(--learning-paper)]/95" : "border-[#D8C8A8] bg-[#FFFDF7]/95"}`}
        aria-label="Navigation mobile"
      >
        {navigation.map(({ label, href, icon: Icon }) => (
          <a
            key={label}
            href={href}
            className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold ${label === active ? (heritage ? "text-[var(--learning-green)]" : "text-[#173F2B]") : heritage ? "text-[var(--learning-muted)]" : "text-[#72766F]"}`}
          >
            <Icon className="size-5" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string | null;
}) {
  return (
    <header className="mx-auto max-w-7xl px-4 pt-10 sm:px-8 sm:pt-14 lg:px-12">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B56E26]">{eyebrow}</p>
      <h1 className="mt-3 max-w-4xl font-serif text-4xl font-semibold leading-[1.05] text-[#173F2B] sm:text-5xl lg:text-6xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-5 max-w-2xl text-base leading-7 text-[#62675F] sm:text-lg">
          {description}
        </p>
      ) : null}
    </header>
  );
}

export function LearningBreadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav
      aria-label="Fil d’Ariane"
      className="mx-auto max-w-7xl overflow-x-auto px-4 pt-6 sm:px-8 lg:px-12"
    >
      <ol className="flex min-w-max items-center gap-2 text-sm text-[#6A6F68]">
        <li>
          <Link to="/apprendre" className="rounded px-1 py-2 font-semibold hover:text-[#173F2B]">
            Apprendre
          </Link>
        </li>
        {items.map((item) => (
          <li key={`${item.label}-${item.href ?? "current"}`} className="flex items-center gap-2">
            <ChevronRight className="size-4 text-[#B8AC96]" aria-hidden="true" />
            {item.href ? (
              <a href={item.href} className="rounded px-1 py-2 font-semibold hover:text-[#173F2B]">
                {item.label}
              </a>
            ) : (
              <span aria-current="page" className="max-w-52 truncate px-1 py-2">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function AccessBadge({ tier }: { tier: LearningSession["access_tier"] }) {
  if (!tier) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${tier === "free" ? "bg-[#E5F1E8] text-[#24613F]" : "bg-[#F5E7C8] text-[#7B5313]"}`}
    >
      {tier === "premium" ? <LockKeyhole className="size-3" aria-hidden="true" /> : null}
      {tier === "free" ? "Gratuit" : "Premium"}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[#CFC3AD] bg-[#FFFDF7] px-5 py-10 text-center sm:px-8">
      <BookOpen className="mx-auto size-8 text-[#B56E26]" aria-hidden="true" />
      <h2 className="mt-4 font-serif text-2xl font-semibold text-[#173F2B]">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#686D65]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function CatalogState({
  query,
  children,
  variant = "default",
}: {
  query: ReturnType<typeof useLearningCatalog>;
  children: (catalog: LearningCatalog) => ReactNode;
  variant?: "default" | "heritage";
}) {
  if (query.isPending)
    return (
      <LearningShell variant={variant}>
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-8">
          <div className="h-8 w-48 animate-pulse rounded-full bg-[#E8DECC]" />
          <div className="mt-5 h-32 animate-pulse rounded-3xl bg-[#EFE7D8]" />
        </div>
      </LearningShell>
    );
  if (query.isError)
    return (
      <LearningShell variant={variant}>
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-8">
          <EmptyState
            title="Le catalogue ne peut pas être chargé"
            description="Réessayez dans quelques instants. Aucun contenu n’a été modifié."
          />
        </div>
      </LearningShell>
    );
  if (!query.data.enabled)
    return (
      <LearningShell variant={variant}>
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-8">
          <EmptyState
            title="Le catalogue revient bientôt"
            description="L’expérience Apprendre est temporairement désactivée. Vos cours et vos données restent intacts."
            action={
              <Link
                to="/"
                className="inline-flex min-h-12 items-center rounded-full bg-[#173F2B] px-6 font-bold text-white"
              >
                Retour à l’accueil
              </Link>
            }
          />
        </div>
      </LearningShell>
    );
  return <>{children(query.data)}</>;
}

export function LearningCard({
  subject,
  bookCount,
  cover,
}: {
  subject: LearningSubject;
  bookCount: number;
  cover?: string | null;
}) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-[#D9CEB9] bg-[#FFFDF7] shadow-[0_16px_40px_rgba(54,45,28,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(54,45,28,0.12)]">
      <a
        href={`/apprendre/${subject.slug}`}
        className="block min-h-44 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#173F2B]"
      >
        <div className="relative h-32 overflow-hidden bg-[linear-gradient(135deg,#173F2B,#3E7955)]">
          {cover ? (
            <img
              src={cover}
              alt=""
              className="size-full object-cover opacity-75 transition duration-500 group-hover:scale-[1.03]"
            />
          ) : null}
          <span className="absolute bottom-4 left-4 grid size-11 place-items-center rounded-2xl bg-[#FFFDF7]/95 text-[#173F2B] shadow-lg">
            <LibraryBig className="size-5" aria-hidden="true" />
          </span>
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-serif text-2xl font-semibold leading-tight text-[#173F2B]">
              {subject.name}
            </h2>
            <ArrowRight
              className="mt-1 size-5 shrink-0 text-[#B56E26] transition group-hover:translate-x-1"
              aria-hidden="true"
            />
          </div>
          {subject.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#666A63]">
              {subject.description}
            </p>
          ) : null}
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[#8B7650]">
            {bookCount} {bookCount > 1 ? "livres ou méthodes" : "livre ou méthode"}
          </p>
        </div>
      </a>
    </article>
  );
}

export function BookCard({ book }: { book: LearningBook }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-[#D9CEB9] bg-[#FFFDF7] shadow-[var(--shadow-card)]">
      <Link
        to="/apprendre/livre/$bookId"
        params={{ bookId: book.id }}
        className="group grid min-h-44 grid-cols-[7rem_1fr] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#173F2B] sm:grid-cols-[9rem_1fr]"
      >
        <div className="relative bg-[#E9DFC9]">
          {book.cover_url ? (
            <img src={book.cover_url} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <BookOpen
              className="absolute left-1/2 top-1/2 size-9 -translate-x-1/2 -translate-y-1/2 text-[#9B855E]"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-col p-5 sm:p-6">
          {book.level ? (
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#B56E26]">
              {book.level}
            </p>
          ) : null}
          <h2 className="mt-2 font-serif text-2xl font-semibold leading-tight text-[#173F2B]">
            {book.title}
          </h2>
          {book.author ? (
            <p className="mt-1 text-sm font-medium text-[#666A63]">Par {book.author}</p>
          ) : null}
          {book.description ? (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#666A63]">{book.description}</p>
          ) : null}
          <span className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-bold text-[#173F2B]">
            Découvrir{" "}
            <ArrowRight
              className="size-4 transition group-hover:translate-x-1"
              aria-hidden="true"
            />
          </span>
        </div>
      </Link>
    </article>
  );
}

export function HeritageBookCard({
  book,
  subject,
  index,
  sessionCount,
}: {
  book: LearningBook;
  subject?: LearningSubject;
  index: number;
  sessionCount: number;
}) {
  return (
    <article className="rounded-xl bg-[var(--learning-paper)]">
      <a
        href={`/apprendre/livre/${book.id}`}
        className="group flex min-h-18 items-center gap-3 rounded-xl px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--learning-green)]"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-[var(--learning-sand)] text-2xl font-extrabold text-[var(--learning-green)]">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-bold text-[var(--learning-green)]">
            {book.title}
          </span>
          <span className="mt-1 block truncate text-[11px] text-[var(--learning-muted)]">
            {[subject?.name, book.level, sessionCount ? `${sessionCount} cours` : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        <ArrowRight
          className="size-4 shrink-0 text-[var(--learning-gold-text)] transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </a>
    </article>
  );
}

export function LessonCard({
  lesson,
  sessionCount,
  completedCount = 0,
}: {
  lesson: LearningLesson;
  sessionCount: number;
  completedCount?: number;
}) {
  return (
    <a
      href={`/apprendre/lecon/${lesson.id}`}
      className="group flex min-h-20 items-center gap-4 rounded-2xl border border-[#DED3BF] bg-white p-4 transition hover:border-[#92A995] hover:bg-[#F8FBF8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F2B]"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#E7F0E9] text-[#24613F]">
        <BookOpen className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-5 text-[#29302A]">{lesson.title}</span>
        <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-[#72776F]">
          <span>
            {sessionCount} {sessionCount > 1 ? "séances" : "séance"}
          </span>
          {lesson.duration_minutes ? <span>{lesson.duration_minutes} min</span> : null}
          {sessionCount ? (
            <span>
              {completedCount}/{sessionCount} terminé
            </span>
          ) : null}
        </span>
      </span>
      <ChevronRight
        className="size-5 shrink-0 text-[#A89777] transition group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </a>
  );
}

export function ChapterList({
  chapters,
  lessons,
  sessions,
  progress = [],
  variant = "default",
  nextSessionId,
}: {
  chapters: LearningChapter[];
  lessons: LearningLesson[];
  sessions: LearningSession[];
  progress?: SessionProgress[];
  variant?: "default" | "heritage";
  nextSessionId?: string | null;
}) {
  if (chapters.length === 0)
    return (
      <EmptyState
        title="Aucun chapitre publié"
        description="La structure de ce livre est en préparation."
      />
    );
  if (variant === "heritage") {
    const chapterIds = new Set(chapters.map((chapter) => chapter.id));
    const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson] as const));
    const orderedSessions = [...sessions]
      .filter((session) => {
        const chapterId = lessonById.get(session.lesson_id)?.chapter_id;
        return Boolean(chapterId && chapterIds.has(chapterId));
      })
      .sort(
        (left, right) => left.order_index - right.order_index || left.id.localeCompare(right.id),
      );
    const courseNumber = new Map(
      orderedSessions.map((session, index) => [session.id, index + 1] as const),
    );

    return (
      <div className="space-y-3">
        {chapters.map((chapter, index) => {
          const chapterLessons = lessons.filter((lesson) => lesson.chapter_id === chapter.id);
          const chapterLessonIds = new Set(chapterLessons.map((lesson) => lesson.id));
          const chapterSessions = orderedSessions.filter((session) =>
            chapterLessonIds.has(session.lesson_id),
          );
          const completedCount = chapterSessions.filter((session) => {
            const status = sessionStatus(progress, session.id);
            return status === "completed" || status === "validated";
          }).length;
          const isCurrentChapter = chapterSessions.some((session) => session.id === nextSessionId);
          const chapterTitle = chapter.title.replace(/^Chapitre\s+\d+\s*[—-]\s*/i, "");

          return (
            <details
              key={chapter.id}
              open={isCurrentChapter || (!nextSessionId && index === 0)}
              className="group rounded-xl bg-[var(--learning-paper)]"
            >
              <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--learning-green)]">
                <span className="text-lg font-extrabold text-[var(--learning-green)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-[var(--learning-green)]">
                    {chapterTitle}
                  </span>
                  <span className="mt-1 block text-xs text-[var(--learning-muted)]">
                    {chapterSessions.length} cours
                    {chapterSessions.length
                      ? ` · ${completedCount}/${chapterSessions.length} achevés`
                      : ""}
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-[var(--learning-muted)] transition group-open:rotate-90"
                  aria-hidden="true"
                />
              </summary>
              {chapterSessions.length ? (
                <div className="px-2 pb-2">
                  {chapterSessions.map((session) => {
                    const status = sessionStatus(progress, session.id);
                    const active = session.id === nextSessionId;
                    const StatusIcon =
                      status === "validated"
                        ? ShieldCheck
                        : status === "completed"
                          ? CheckCircle2
                          : status === "in_progress"
                            ? Play
                            : Circle;
                    const statusLabel =
                      status === "validated"
                        ? "Validé"
                        : status === "completed"
                          ? "Terminé"
                          : status === "in_progress"
                            ? "En cours"
                            : "Non commencé";
                    const title = session.title.replace(/^\d{1,3}\s*[—-]\s*/, "");
                    return (
                      <Link
                        key={session.id}
                        to="/apprendre/seance/$sessionId"
                        params={{ sessionId: session.id }}
                        className={`flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--learning-green)] ${active ? "bg-[var(--learning-soft-green)] font-bold" : "hover:bg-[var(--learning-ivory)]"}`}
                      >
                        <span className="w-7 shrink-0 font-bold text-[var(--learning-gold-text)]">
                          {String(courseNumber.get(session.id) ?? 0).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1 text-[var(--learning-green)]">{title}</span>
                        <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-[var(--learning-muted)]">
                          <StatusIcon className="size-3.5" aria-hidden="true" />
                          <span className="sr-only sm:not-sr-only">{statusLabel}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </details>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {chapters.map((chapter, index) => {
        const chapterLessons = lessons
          .filter((lesson) => lesson.chapter_id === chapter.id)
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
        const chapterSessionIds = sessions
          .filter((session) => chapterLessons.some((lesson) => lesson.id === session.lesson_id))
          .map((session) => session.id);
        const chapterProgress = summarizeProgress(progress, chapterSessionIds);
        return (
          <details
            key={chapter.id}
            open={index === 0}
            className="group rounded-3xl border border-[#D9CEB9] bg-[#FFFDF7] shadow-[var(--shadow-card)]"
          >
            <summary className="flex min-h-20 cursor-pointer list-none items-center gap-4 p-5 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#173F2B] sm:p-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#173F2B] font-serif text-lg font-bold text-white">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <a
                  href={`/apprendre/chapitre/${chapter.id}`}
                  className="font-serif text-xl font-semibold text-[#173F2B] hover:underline"
                >
                  {chapter.title}
                </a>
                {chapter.description ? (
                  <span className="mt-1 block line-clamp-1 text-sm text-[#6B7069]">
                    {chapter.description}
                  </span>
                ) : null}
                {chapterProgress.total ? (
                  <div className="mt-3 max-w-xs">
                    <ProgressBar
                      value={chapterProgress.percent}
                      label={`${chapterProgress.completed}/${chapterProgress.total} séances`}
                    />
                  </div>
                ) : null}
              </span>
              <ChevronRight
                className="size-5 shrink-0 text-[#9C8967] transition group-open:rotate-90"
                aria-hidden="true"
              />
            </summary>
            <div className="space-y-3 border-t border-[#E4DAC7] px-4 py-4 sm:px-6 sm:py-5">
              {chapterLessons.length ? (
                chapterLessons.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    sessionCount={
                      sessions.filter((session) => session.lesson_id === lesson.id).length
                    }
                    completedCount={
                      summarizeProgress(
                        progress,
                        sessions
                          .filter((session) => session.lesson_id === lesson.id)
                          .map((session) => session.id),
                      ).completed
                    }
                  />
                ))
              ) : (
                <p className="py-4 text-center text-sm text-[#72776F]">
                  Aucune leçon publiée dans ce chapitre.
                </p>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}

export function SessionCard({
  session,
  progress = [],
}: {
  session: LearningSession;
  progress?: SessionProgress[];
}) {
  const status = sessionStatus(progress, session.id);
  return (
    <a
      href={`/apprendre/seance/${session.id}`}
      className="group flex min-h-24 items-center gap-4 rounded-2xl border border-[#D9CEB9] bg-[#FFFDF7] p-4 shadow-[var(--shadow-card)] transition hover:border-[#8CA38F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173F2B] sm:p-5"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#E6F0E8] text-[#24613F]">
        <GraduationCap className="size-6" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-[#29302A]">{session.title}</span>
        <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#72776F]">
          {session.duration_minutes ? (
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3.5" aria-hidden="true" /> {session.duration_minutes} min
            </span>
          ) : null}
          <AccessBadge tier={session.access_tier} />
          <ProgressBadge status={status} />
        </span>
      </span>
      <ChevronRight
        className="size-5 shrink-0 text-[#9C8967] transition group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </a>
  );
}
