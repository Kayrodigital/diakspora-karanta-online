import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Play } from "lucide-react";
import { LessonPathNode } from "@/features/eleve/LessonPathNode";
import { ReviewCard } from "@/features/eleve/ReviewCard";
import { BottomNav } from "@/features/eleve/BottomNav";
import {
  mockStudent,
  mockTodaysLesson,
  mockJuzAmmaPath,
  mockReviews,
} from "@/features/eleve/mock-data";

export const Route = createFileRoute("/eleve")({
  head: () => ({
    meta: [
      { title: "Espace Élève — Diakspora Karanta" },
      { name: "description", content: "Leçon du jour, chemin d'apprentissage et révisions pour l'élève." },
    ],
  }),
  component: ElevePage,
});

function greetingIcon() {
  const h = new Date().getHours();
  return h >= 6 && h < 19 ? "☀️" : "🌙";
}

function ElevePage() {
  const student = mockStudent;
  const lesson = mockTodaysLesson;
  const path = mockJuzAmmaPath;
  const reviews = mockReviews;
  const doneCount = path.filter((n) => n.status === "done").length;

  return (
    <div className="min-h-screen bg-[color:var(--cream)] text-foreground">
      <div className="mx-auto max-w-md pb-28">
        {/* 1. Header */}
        <header className="flex items-center gap-3 px-5 pt-6">
          <div
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-display-kid)] text-xl font-bold text-[color:var(--anthracite)] shadow-[var(--shadow-gold)]"
            style={{ background: "var(--gradient-gold)" }}
          >
            {student.firstName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-[family-name:var(--font-display-kid)] text-lg font-bold text-foreground">
              Salut {student.firstName} ! <span aria-hidden>{greetingIcon()}</span>
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {student.cohortName} · {student.groupLabel}
            </p>
          </div>
          <button
            type="button"
            aria-label={`Notifications (${student.unreadNotifications} non lues)`}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--cream-2)] bg-card"
          >
            <Bell size={20} aria-hidden />
            {student.unreadNotifications > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--gold-dark)] px-1 text-[10px] font-bold text-[color:var(--cream)]">
                {student.unreadNotifications}
              </span>
            )}
          </button>
        </header>

        {/* Back to home (small, unobtrusive) */}
        <div className="mt-3 px-5">
          <Link
            to="/"
            className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"
          >
            ← Diakspora Karanta
          </Link>
        </div>

        {/* 2. Leçon du jour */}
        <section className="mt-5 px-5">
          <div
            className="relative overflow-hidden rounded-3xl p-5 text-[color:var(--cream)] shadow-[var(--shadow-elegant)]"
            style={{ background: "var(--gradient-lesson)" }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-25"
              style={{ background: "var(--gradient-gold)" }}
            />
            <p className="relative text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--gold-soft)]">
              Leçon du jour
            </p>

            <div className="relative mt-3 flex items-start gap-4">
              <div
                aria-hidden
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--cream)]/12 text-4xl backdrop-blur"
              >
                {lesson.thumbnailEmoji}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-[family-name:var(--font-display-kid)] text-2xl font-bold leading-tight">
                  {lesson.title}
                </h2>
                <p className="mt-1 text-sm text-[color:var(--cream)]/85">
                  {lesson.subtitle} · {lesson.durationMin} min
                </p>
              </div>
            </div>

            <button
              type="button"
              className="relative mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--gold)] px-6 font-[family-name:var(--font-display-kid)] text-lg font-bold text-[color:var(--anthracite)] shadow-[var(--shadow-gold)] transition active:scale-[0.98] hover:bg-[color:var(--gold-soft)]"
            >
              <Play size={22} fill="currentColor" aria-hidden />
              Commencer
            </button>
          </div>
        </section>

        {/* 3. Ton chemin — Juzʾ ʿAmma */}
        <section className="mt-8 px-5">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--gold-dark)]">
                Ton chemin
              </p>
              <h2 className="font-[family-name:var(--font-display-kid)] text-xl font-bold text-foreground">
                Juzʾ ʿAmma
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-[color:var(--gold)]/25 px-3 py-1 font-[family-name:var(--font-display-kid)] text-sm font-bold text-[color:var(--gold-dark)]">
              {doneCount}/{path.length} 🌟
            </span>
          </div>

          <ol className="mt-5 flex flex-col gap-2">
            {path.map((node, i) => (
              <LessonPathNode
                key={node.id}
                node={node}
                isLast={i === path.length - 1}
              />
            ))}
          </ol>
        </section>

        {/* 4. À réviser aujourd'hui */}
        <section className="mt-8 px-5">
          <h2 className="font-[family-name:var(--font-display-kid)] text-xl font-bold text-foreground">
            À réviser aujourd'hui
          </h2>
          <p className="text-xs text-muted-foreground">
            Une petite révision pour bien ancrer ce que tu as appris.
          </p>

          {reviews.length > 0 ? (
            <div className="mt-4 flex flex-col gap-3">
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border-2 border-dashed border-[color:var(--gold)]/50 bg-card p-6 text-center">
              <div aria-hidden className="text-4xl">🎉</div>
              <p className="mt-2 font-[family-name:var(--font-display-kid)] text-lg font-bold text-[color:var(--deep-green)]">
                Bravo, rien à réviser aujourd'hui !
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Reviens demain pour de nouvelles révisions.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* 5. Bottom nav */}
      <BottomNav />
    </div>
  );
}
