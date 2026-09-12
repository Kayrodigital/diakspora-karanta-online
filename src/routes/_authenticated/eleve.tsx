import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Bell, BookOpen, CalendarDays, Clock3, LogOut, Play, Radio } from "lucide-react";
import { BottomNav } from "@/features/eleve/BottomNav";
import { loadStudentHome } from "@/features/eleve/student-data";
import { supabase } from "@/integrations/supabase/client";
import { organizationTheme } from "@/lib/organization-theme";

export const Route = createFileRoute("/_authenticated/eleve")({
  head: () => ({
    meta: [
      { title: "Espace Élève — Diakspora Karanta" },
      { name: "description", content: "Tes cours, tes directs et ta progression." },
    ],
  }),
  component: ElevePage,
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function greetingIcon() {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 19 ? "☀️" : "🌙";
}

function progressPercent(completed: number, total: number) {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

function ElevePage() {
  const navigate = useNavigate();
  const { organization, user } = Route.useRouteContext();
  const { data } = useSuspenseQuery({
    queryKey: ["eleve-dashboard", organization.id, user.id],
    queryFn: () => loadStudentHome(organization.id, user.id),
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div
      className="min-h-screen bg-[color:var(--cream)] text-foreground"
      style={organizationTheme(organization)}
    >
      <main className="mx-auto w-full max-w-md pb-28 md:max-w-3xl lg:max-w-6xl">
        <header id="profil" className="scroll-mt-4 flex items-center gap-3 px-5 pt-6 md:px-8">
          <div
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-display-kid)] text-xl font-bold text-[color:var(--anthracite)] shadow-[var(--shadow-gold)]"
            style={{ background: "var(--gradient-gold)" }}
          >
            {data.firstName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-[family-name:var(--font-display-kid)] text-lg font-bold">
              Salut {data.firstName} ! <span aria-hidden>{greetingIcon()}</span>
            </p>
            <p className="truncate text-xs text-muted-foreground">{data.cohortName}</p>
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

        <section className="mt-5 px-5 md:px-8">
          <div
            className="relative overflow-hidden rounded-3xl p-5 text-[color:var(--cream)] shadow-[var(--shadow-elegant)] md:p-7"
            style={{ background: "var(--gradient-lesson)" }}
          >
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
            <p className="relative text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--gold-soft)]">
              Reprendre mon apprentissage
            </p>
            {data.nextLesson ? (
              <div className="relative mt-3 md:flex md:items-end md:justify-between md:gap-8">
                <div className="flex items-start gap-4">
                  <div
                    aria-hidden
                    className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-4xl backdrop-blur"
                  >
                    📖
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="font-[family-name:var(--font-display-kid)] text-2xl font-bold leading-tight md:text-3xl">
                      {data.nextLesson.title}
                    </h1>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-white/80">
                      <Clock3 size={15} aria-hidden />
                      {data.nextLesson.duration_minutes ?? 5} min
                    </p>
                  </div>
                </div>
                <Link
                  to="/lecon"
                  search={{ id: data.nextLesson.id }}
                  className="mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--gold)] px-6 font-[family-name:var(--font-display-kid)] text-lg font-bold text-[color:var(--anthracite)] shadow-[var(--shadow-gold)] transition hover:brightness-105 active:scale-[0.98] md:mt-0 md:w-auto md:min-w-52"
                >
                  <Play size={21} fill="currentColor" aria-hidden />
                  Continuer
                </Link>
              </div>
            ) : (
              <div className="relative mt-4 rounded-2xl bg-white/10 p-4">
                <p className="font-medium">Ton prochain cours apparaîtra ici.</p>
                <p className="mt-1 text-sm text-white/75">
                  Ton professeur doit d’abord publier un cours et t’inscrire dans sa classe.
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
          <section id="courses" className="scroll-mt-4 px-5 md:px-8 lg:px-0">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--gold-dark)]">
                  Bibliothèque
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-display-kid)] text-2xl font-bold">
                  Mes cours
                </h2>
              </div>
              <span className="rounded-full bg-[color:var(--deep-green)]/10 px-3 py-1 text-xs font-semibold text-[color:var(--deep-green)]">
                {data.courses.length} cours
              </span>
            </div>

            {data.courses.length ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {data.courses.map(({ course, lessonCount, completedCount, nextLessonId }) => {
                  const percent = progressPercent(completedCount, lessonCount);
                  return (
                    <article
                      key={course.id}
                      className="overflow-hidden rounded-3xl border border-[color:var(--cream-2)] bg-card shadow-[var(--shadow-card)]"
                    >
                      {course.cover_url ? (
                        <img
                          src={course.cover_url}
                          alt=""
                          className="h-36 w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          aria-hidden
                          className="flex h-28 items-center justify-center text-[color:var(--anthracite)]"
                          style={{ background: "var(--gradient-gold)" }}
                        >
                          <BookOpen size={42} />
                        </div>
                      )}
                      <div className="p-5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--gold-dark)]">
                          {course.level || course.language}
                        </p>
                        <h3 className="mt-1 font-[family-name:var(--font-display-kid)] text-xl font-bold leading-tight">
                          {course.title}
                        </h3>
                        {course.description && (
                          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                            {course.description}
                          </p>
                        )}
                        <div className="mt-4 flex items-center justify-between text-xs">
                          <span>{completedCount} leçons terminées</span>
                          <span className="font-bold">{percent}%</span>
                        </div>
                        <div
                          className="mt-2 h-2 overflow-hidden rounded-full bg-[color:var(--cream-2)]"
                          role="progressbar"
                          aria-label={`Progression dans ${course.title}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={percent}
                        >
                          <div
                            className="h-full rounded-full bg-[color:var(--deep-green)] transition-[width]"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        {nextLessonId ? (
                          <Link
                            to="/lecon"
                            search={{ id: nextLessonId }}
                            className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[color:var(--deep-green)] px-4 font-semibold text-white"
                          >
                            <Play size={17} aria-hidden />
                            {percent > 0 ? "Reprendre" : "Commencer"}
                          </Link>
                        ) : (
                          <p className="mt-5 rounded-xl bg-[color:var(--cream-2)]/60 px-4 py-3 text-center text-sm text-muted-foreground">
                            Les leçons arrivent bientôt
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-3xl border border-dashed border-[color:var(--gold-dark)]/40 bg-card p-7 text-center">
                <BookOpen className="mx-auto text-[color:var(--gold-dark)]" size={34} aria-hidden />
                <p className="mt-3 font-semibold">Aucun cours accessible pour le moment</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Dès ton inscription à une classe, ses cours s’afficheront ici.
                </p>
              </div>
            )}
          </section>

          <section id="directs" className="scroll-mt-4 px-5 md:px-8 lg:px-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Radio size={20} aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-600">
                  En direct
                </p>
                <h2 className="font-[family-name:var(--font-display-kid)] text-2xl font-bold">
                  Prochains rendez-vous
                </h2>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {data.upcomingLives.length ? (
                data.upcomingLives.map((session) => (
                  <article
                    key={session.id}
                    className="rounded-2xl border border-[color:var(--cream-2)] bg-card p-4 shadow-[var(--shadow-card)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--gold)]/20 text-[color:var(--gold-dark)]">
                        <CalendarDays size={21} aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold leading-tight">{session.title}</h3>
                        <p className="mt-1 text-xs capitalize text-muted-foreground">
                          {dateFormatter.format(new Date(session.starts_at))} · {session.provider}
                        </p>
                      </div>
                    </div>
                    {session.join_url && (
                      <a
                        href={session.join_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 flex min-h-11 items-center justify-center rounded-xl border border-[color:var(--deep-green)] font-semibold text-[color:var(--deep-green)]"
                      >
                        Rejoindre le cours
                      </a>
                    )}
                  </article>
                ))
              ) : (
                <div className="rounded-2xl bg-card p-5 text-sm text-muted-foreground">
                  Aucun direct programmé. Les prochains rendez-vous envoyés par ton professeur
                  apparaîtront ici.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <BottomNav active="home" />
    </div>
  );
}
