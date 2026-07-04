import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  BookOpen,
  Clock,
  Sparkles,
  ClipboardCheck,
  Video,
  CreditCard,
  Award,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import { AttendanceStatusBadge } from "@/features/parent/AttendanceStatusBadge";
import { WeeklyStatCard } from "@/features/parent/WeeklyStatCard";
import { RecommendationCard } from "@/features/parent/RecommendationCard";
import { ChildSwitcher } from "@/features/parent/ChildSwitcher";
import { ParentBottomNav } from "@/features/parent/ParentBottomNav";
import {
  mockParent,
  mockChildren,
  mockAttendance,
  mockWeekly,
  mockJuz,
  mockRecommendations,
  mockNextStep,
} from "@/features/parent/mock-data";

export const Route = createFileRoute("/parent")({
  head: () => ({
    meta: [
      { title: "Espace Parent — Diakspora Karanta" },
      {
        name: "description",
        content:
          "Suivi de régularité, progression et communication professeurs pour accompagner votre enfant.",
      },
    ],
  }),
  component: ParentPage,
});

function ParentPage() {
  const [activeChildId, setActiveChildId] = useState(mockChildren[0].id);
  const activeChild =
    mockChildren.find((c) => c.id === activeChildId) ?? mockChildren[0];

  const juzPct = Math.round((mockJuz.done / mockJuz.total) * 100);

  return (
    <div className="min-h-screen bg-[color:var(--cream)] text-foreground">
      <div className="mx-auto max-w-md pb-28">
        {/* 1. Header */}
        <header className="px-5 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--gold-dark)]">
                Espace Parent
              </p>
              <h1 className="mt-1 font-serif text-2xl leading-tight text-foreground">
                As-salāmu ʿalaykum, {mockParent.firstName}
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {activeChild.cohortName} · {activeChild.groupLabel}
              </p>
            </div>
            <ChildSwitcher
              children={mockChildren}
              activeChildId={activeChildId}
              onChange={setActiveChildId}
            />
          </div>

          <div className="mt-3">
            <Link
              to="/"
              className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"
            >
              ← Diakspora Karanta
            </Link>
          </div>
        </header>

        {/* 2. Attendance status */}
        <div className="mt-5 px-5">
          <AttendanceStatusBadge status={mockAttendance} />
        </div>

        {/* 3. Weekly summary */}
        <section className="mt-8 px-5">
          <h2 className="font-serif text-xl text-foreground">
            Résumé de la semaine
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <WeeklyStatCard
              label="Leçons"
              value={mockWeekly.lessonsCompleted}
              icon={<BookOpen size={14} aria-hidden />}
            />
            <WeeklyStatCard
              label="Temps"
              value={mockWeekly.learningTime}
              icon={<Clock size={14} aria-hidden />}
            />
            <WeeklyStatCard
              label="Sourates mémorisées"
              value={mockWeekly.surahsMemorized}
              icon={<Sparkles size={14} aria-hidden />}
            />
            <WeeklyStatCard
              label="Devoirs rendus"
              value={mockWeekly.homeworkSubmitted}
              icon={<ClipboardCheck size={14} aria-hidden />}
            />
          </div>
        </section>

        {/* 4. Juz' Amma progress (condensed) */}
        <section className="mt-8 px-5">
          <div className="rounded-2xl border border-[color:var(--cream-2)] bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--gold-dark)]">
                  Progression
                </p>
                <h2 className="mt-1 font-serif text-xl text-foreground">
                  Juzʾ ʿAmma
                </h2>
              </div>
              <p className="font-serif text-lg text-[color:var(--deep-green)]">
                {mockJuz.done}/{mockJuz.total}{" "}
                <span className="text-sm text-muted-foreground">sourates</span>
              </p>
            </div>

            <div
              className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[color:var(--cream-2)]"
              role="progressbar"
              aria-valuenow={juzPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progression Juzʾ ʿAmma"
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${juzPct}%`,
                  background: "var(--gradient-gold)",
                }}
              />
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--deep-green)] hover:text-[color:var(--deep-green-hi)]"
              >
                Voir en détail
                <ChevronRight size={14} aria-hidden />
              </button>
            </div>
          </div>
        </section>

        {/* 5. Recommendations */}
        <section className="mt-8 px-5">
          <h2 className="font-serif text-xl text-foreground">
            Ce que vous pouvez faire
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Quelques suggestions bienveillantes pour accompagner {activeChild.firstName}.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {mockRecommendations.map((r) => (
              <RecommendationCard key={r.id} recommendation={r} />
            ))}
          </div>
        </section>

        {/* 6. Next step */}
        <section className="mt-8 px-5">
          <h2 className="font-serif text-xl text-foreground">Prochaine étape</h2>

          <div
            className="mt-4 overflow-hidden rounded-2xl p-5 text-[color:var(--cream)] shadow-[var(--shadow-elegant)]"
            style={{ background: "var(--gradient-lesson)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--gold-soft)]">
              Prochaine séance Zoom
            </p>
            <p className="mt-2 font-serif text-xl leading-tight">
              {mockNextStep.zoomDate} · {mockNextStep.zoomTime}
            </p>
            <p className="mt-1 text-sm text-[color:var(--cream)]/80">
              {mockNextStep.zoomTopic}
            </p>
            <a
              href={mockNextStep.zoomUrl ?? "#"}
              className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[color:var(--gold)] px-5 font-semibold text-[color:var(--anthracite)] shadow-[var(--shadow-gold)] transition hover:bg-[color:var(--gold-soft)]"
            >
              <Video size={18} aria-hidden />
              Rejoindre la séance
            </a>
          </div>

          <div className="mt-3 rounded-2xl border border-[color:var(--cream-2)] bg-card p-4 shadow-[var(--shadow-card)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--gold-dark)]">
              Prochain module
            </p>
            <p className="mt-1 font-serif text-base text-foreground">
              {mockNextStep.nextModuleTitle}
            </p>
          </div>
        </section>

        {/* 7. Quick access */}
        <section className="mt-8 px-5">
          <h2 className="font-serif text-xl text-foreground">Accès rapides</h2>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <QuickAccessCard
              icon={<CreditCard size={18} aria-hidden />}
              title="Paiement & abonnement"
              subtitle="Gérer votre formule et vos factures"
            />
            <QuickAccessCard
              icon={<Award size={18} aria-hidden />}
              title="Certificats obtenus"
              subtitle="Télécharger les certificats de votre enfant"
            />
            <QuickAccessCard
              icon={<MessageCircle size={18} aria-hidden />}
              title="Contacter le professeur"
              subtitle="Messagerie FR / AR avec traduction"
            />
          </div>
        </section>
      </div>

      <ParentBottomNav />
    </div>
  );
}

function QuickAccessCard({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-2xl border border-[color:var(--cream-2)] bg-card p-4 text-left shadow-[var(--shadow-card)] transition active:scale-[0.99]"
    >
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[color:var(--deep-green)]"
        style={{
          background: "color-mix(in oklab, var(--deep-green) 10%, var(--cream))",
        }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-base text-foreground">
          {title}
        </span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <ChevronRight size={18} className="text-muted-foreground" aria-hidden />
    </button>
  );
}
