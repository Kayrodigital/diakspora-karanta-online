import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Bell, Play, LogOut } from "lucide-react";
import { LessonPathNode } from "@/features/eleve/LessonPathNode";
import { ReviewCard } from "@/features/eleve/ReviewCard";
import { BottomNav } from "@/features/eleve/BottomNav";
import { mockReviews, type SurahNode } from "@/features/eleve/mock-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/eleve")({
  head: () => ({
    meta: [
      { title: "Espace Élève — Diakspora Karanta" },
      { name: "description", content: "Ta leçon du jour et tes révisions." },
    ],
  }),
  component: ElevePage,
});

function greetingIcon() {
  const h = new Date().getHours();
  return h >= 6 && h < 19 ? "☀️" : "🌙";
}

function firstArabicChar(title: string): string {
  const m = title.match(/[\u0600-\u06FF]/);
  return m ? m[0] : title.charAt(0);
}

async function loadStudentData() {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user!.id;

  const [{ data: profile }, { data: lessons }, { data: progress }] = await Promise.all([
    supabase.from("profiles").select("full_name, cohort_name").eq("id", uid).maybeSingle(),
    supabase.from("lessons").select("id, title, duration_minutes, order_index").order("order_index", { ascending: true }),
    supabase.from("progress").select("lesson_id, status").eq("user_id", uid),
  ]);

  const doneIds = new Set(
    (progress ?? []).filter((p) => p.status === "completed").map((p) => p.lesson_id),
  );

  const path: (SurahNode & { lessonId: string })[] = (lessons ?? []).map((l, i, arr) => {
    const done = doneIds.has(l.id);
    const prevDone = i === 0 || doneIds.has(arr[i - 1].id);
    return {
      id: l.id,
      lessonId: l.id,
      name: l.title,
      arabicLetter: firstArabicChar(l.title),
      status: done ? "done" : prevDone ? "current" : "upcoming",
    };
  });

  const nextLesson = (lessons ?? []).find((l) => !doneIds.has(l.id)) ?? lessons?.[0] ?? null;

  return {
    firstName: profile?.full_name?.split(" ")[0] ?? "Élève",
    cohort: profile?.cohort_name ?? "Promotion Étoile",
    path,
    nextLesson,
    doneCount: doneIds.size,
  };
}

function ElevePage() {
  const navigate = useNavigate();
  const { data } = useSuspenseQuery({
    queryKey: ["eleve-dashboard"],
    queryFn: loadStudentData,
  });

  const { firstName, cohort, path, nextLesson, doneCount } = data;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-[color:var(--cream)] text-foreground">
      <div className="mx-auto max-w-md pb-28">
        <header className="flex items-center gap-3 px-5 pt-6">
          <div
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-display-kid)] text-xl font-bold text-[color:var(--anthracite)] shadow-[var(--shadow-gold)]"
            style={{ background: "var(--gradient-gold)" }}
          >
            {firstName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-[family-name:var(--font-display-kid)] text-lg font-bold">
              Salut {firstName} ! <span aria-hidden>{greetingIcon()}</span>
            </p>
            <p className="truncate text-xs text-muted-foreground">{cohort}</p>
          </div>
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--cream-2)] bg-card"
          >
            <Bell size={20} aria-hidden />
          </button>
          <button
            type="button"
            onClick={signOut}
            aria-label="Se déconnecter"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--cream-2)] bg-card"
          >
            <LogOut size={18} aria-hidden />
          </button>
        </header>

        <section className="mt-5 px-5">
          <div
            className="relative overflow-hidden rounded-3xl p-5 text-[color:var(--cream)] shadow-[var(--shadow-elegant)]"
            style={{ background: "var(--gradient-lesson)" }}
          >
            <p className="relative text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--gold-soft)]">
              Leçon du jour
            </p>

            {nextLesson ? (
              <>
                <div className="relative mt-3 flex items-start gap-4">
                  <div
                    aria-hidden
                    className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--cream)]/12 text-4xl backdrop-blur"
                  >
                    🕌
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-[family-name:var(--font-display-kid)] text-2xl font-bold leading-tight">
                      {nextLesson.title}
                    </h2>
                    <p className="mt-1 text-sm text-[color:var(--cream)]/85">
                      {nextLesson.duration_minutes ?? 5} min
                    </p>
                  </div>
                </div>

                <Link
                  to="/lecon"
                  search={{ id: nextLesson.id }}
                  className="relative mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--gold)] px-6 font-[family-name:var(--font-display-kid)] text-lg font-bold text-[color:var(--anthracite)] shadow-[var(--shadow-gold)] active:scale-[0.98]"
                >
                  <Play size={22} fill="currentColor" aria-hidden />
                  Commencer
                </Link>
              </>
            ) : (
              <p className="relative mt-4 text-[color:var(--cream)]/85">
                Aucune leçon disponible pour le moment.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 px-5">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--gold-dark)]">
                Ton chemin
              </p>
              <h2 className="font-[family-name:var(--font-display-kid)] text-xl font-bold">
                Juzʾ ʿAmma
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-[color:var(--gold)]/25 px-3 py-1 font-[family-name:var(--font-display-kid)] text-sm font-bold text-[color:var(--gold-dark)]">
              {doneCount}/{path.length} 🌟
            </span>
          </div>

          <ol className="mt-5 flex flex-col gap-2">
            {path.map((node, i) => (
              <LessonPathNode key={node.id} node={node} isLast={i === path.length - 1} />
            ))}
          </ol>
        </section>

        <section className="mt-8 px-5">
          <h2 className="font-[family-name:var(--font-display-kid)] text-xl font-bold">
            À réviser aujourd'hui
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {mockReviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
