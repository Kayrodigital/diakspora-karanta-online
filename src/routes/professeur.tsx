import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Video, ClipboardCheck } from "lucide-react";
import { LanguageSwitcher } from "@/features/professeur/LanguageSwitcher";
import { ActionCard } from "@/features/professeur/ActionCard";
import { StudentCard } from "@/features/professeur/StudentCard";
import { getAttendancePalette } from "@/features/professeur/palette";
import { makeT, LANG_META, type Lang } from "@/features/professeur/i18n";
import {
  mockTeacher,
  mockCohorts,
  mockOverview,
  mockActions,
  mockStudents,
  mockHomework,
  mockNextSession,
  type AttendanceLevel,
} from "@/features/professeur/mock-data";

export const Route = createFileRoute("/professeur")({
  head: () => ({
    meta: [
      { title: "Espace Professeur — Diakspora Karanta" },
      {
        name: "description",
        content:
          "Suivi de cohorte, correction des devoirs et sessions Zoom pour les professeurs.",
      },
    ],
  }),
  component: ProfesseurPage,
});

function ProfesseurPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const [filter, setFilter] = useState<AttendanceLevel | null>(null);
  const dir = LANG_META[lang].dir;
  const isRtl = dir === "rtl";
  const t = makeT(lang);

  const arabicStyle = isRtl ? { fontFamily: "var(--font-arabic)" } : undefined;
  const cohort = mockCohorts[0];

  const filteredStudents = filter
    ? mockStudents.filter((s) => s.attendance === filter)
    : mockStudents;

  return (
    <div
      dir={dir}
      lang={lang}
      className="min-h-screen bg-[color:var(--cream)] text-foreground"
    >
      <div className="mx-auto w-full max-w-md pb-10 md:max-w-3xl lg:max-w-5xl">
        {/* 1. Header */}
        <header className="px-5 pt-6">
          <div className="flex justify-end">
            <LanguageSwitcher lang={lang} onChange={setLang} />
          </div>

          <p
            className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--gold-dark)]"
            style={arabicStyle}
          >
            {t("eyebrow_teacher")}
          </p>
          <h1
            className="mt-1 font-serif text-2xl leading-tight text-foreground"
            style={isRtl ? { fontFamily: "var(--font-arabic)", fontSize: "1.75rem" } : undefined}
          >
            {t("greeting")} {mockTeacher.firstName}
          </h1>

          <div
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-[color:var(--cream-2)] bg-card px-3 py-1.5 text-sm shadow-[var(--shadow-card)]"
            style={arabicStyle}
          >
            <span className="text-[color:var(--gold-dark)]">
              {t("cohort")} ·
            </span>
            <span className="font-semibold text-foreground">
              {cohort.name} · {cohort.groupLabel}
            </span>
          </div>
        </header>

        {/* 2. Cohort overview */}
        <section className="mt-6 px-5">
          <h2
            className="font-serif text-xl text-foreground"
            style={isRtl ? { fontFamily: "var(--font-arabic)", fontSize: "1.35rem" } : undefined}
          >
            {t("overview_title")}
          </h2>

          <div className="mt-4 rounded-2xl border border-[color:var(--cream-2)] bg-card p-5 shadow-[var(--shadow-card)]">
            <p
              className="font-serif text-3xl text-[color:var(--deep-green)]"
              style={arabicStyle}
            >
              {mockOverview.totalStudents}{" "}
              <span
                className="text-sm text-muted-foreground"
                style={arabicStyle}
              >
                {t("overview_students")}
              </span>
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {(["regular", "watch", "risk"] as AttendanceLevel[]).map((lvl) => {
                const count =
                  lvl === "regular"
                    ? mockOverview.regular
                    : lvl === "watch"
                      ? mockOverview.watch
                      : mockOverview.risk;
                const palette = getAttendancePalette(lvl);
                const isActive = filter === lvl;
                const label =
                  lvl === "regular"
                    ? t("status_regular")
                    : lvl === "watch"
                      ? t("status_watch")
                      : t("status_risk");

                return (
                  <button
                    key={lvl}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setFilter(isActive ? null : lvl)}
                    className="rounded-xl border-2 p-3 text-center transition active:scale-[0.98]"
                    style={{
                      background: palette.bg,
                      borderColor: isActive ? palette.fg : palette.border,
                    }}
                  >
                    <span
                      aria-hidden
                      className="mx-auto mb-1 block h-2.5 w-2.5 rounded-full"
                      style={{ background: palette.dot }}
                    />
                    <p
                      className="font-serif text-xl"
                      style={{ color: palette.fg }}
                    >
                      {count}
                    </p>
                    <p
                      className="text-[11px] font-semibold"
                      style={{
                        color: palette.fg,
                        fontFamily: isRtl ? "var(--font-arabic)" : undefined,
                        fontSize: isRtl ? "0.85rem" : undefined,
                      }}
                    >
                      {label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3. Recommended actions — emphasized */}
        <section className="mt-8 px-5">
          <div
            className="mb-3 inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{
              background: "color-mix(in oklab, var(--gold) 25%, transparent)",
              color: "var(--gold-dark)",
              fontFamily: isRtl ? "var(--font-arabic)" : undefined,
              fontSize: isRtl ? "0.75rem" : undefined,
              letterSpacing: isRtl ? "0.05em" : undefined,
            }}
          >
            {t("actions_title")}
          </div>

          <div className="flex flex-col gap-3">
            {mockActions.map((a) => (
              <ActionCard key={a.id} action={a} lang={lang} />
            ))}
          </div>
        </section>

        {/* 4. Students list */}
        <section className="mt-8 px-5">
          <h2
            className="font-serif text-xl text-foreground"
            style={isRtl ? { fontFamily: "var(--font-arabic)", fontSize: "1.35rem" } : undefined}
          >
            {t("students_title")}{" "}
            <span className="text-sm text-muted-foreground">
              ({filteredStudents.length})
            </span>
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {filteredStudents.map((s) => (
              <StudentCard key={s.id} student={s} lang={lang} />
            ))}
          </div>
        </section>

        {/* 5. Homework queue */}
        <section className="mt-8 px-5">
          <h2
            className="font-serif text-xl text-foreground"
            style={isRtl ? { fontFamily: "var(--font-arabic)", fontSize: "1.35rem" } : undefined}
          >
            {t("homework_title")}{" "}
            <span className="text-sm text-muted-foreground">
              ({mockHomework.length})
            </span>
          </h2>

          <div className="mt-4 flex flex-col gap-3">
            {mockHomework.map((h) => (
              <article
                key={h.id}
                className="rounded-2xl border border-[color:var(--cream-2)] bg-card p-4 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start gap-3">
                  <div
                    aria-hidden
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[color:var(--deep-green)]"
                    style={{
                      background:
                        "color-mix(in oklab, var(--deep-green) 10%, var(--cream))",
                    }}
                  >
                    <ClipboardCheck size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-serif text-base text-foreground"
                      style={
                        isRtl
                          ? { fontFamily: "var(--font-arabic)", fontSize: "1.1rem" }
                          : undefined
                      }
                    >
                      {h.studentFirstName} · {h.lessonTitle}
                    </p>
                    <p
                      className="mt-0.5 text-xs text-muted-foreground"
                      style={
                        isRtl
                          ? { fontFamily: "var(--font-arabic)", fontSize: "0.85rem" }
                          : undefined
                      }
                    >
                      {t("submitted_days", { n: h.submittedDaysAgo })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--gold)] px-4 font-bold text-[color:var(--anthracite)] shadow-[var(--shadow-gold)] transition active:scale-[0.98] hover:bg-[color:var(--gold-soft)]"
                  style={isRtl ? { fontFamily: "var(--font-arabic)", fontSize: "1rem" } : undefined}
                >
                  <ClipboardCheck size={18} aria-hidden />
                  <span>{t("grade_button")}</span>
                </button>
              </article>
            ))}
          </div>
        </section>

        {/* 6. Next session */}
        <section className="mt-8 px-5">
          <h2
            className="font-serif text-xl text-foreground"
            style={isRtl ? { fontFamily: "var(--font-arabic)", fontSize: "1.35rem" } : undefined}
          >
            {t("next_session_title")}
          </h2>

          <div
            className="mt-4 overflow-hidden rounded-2xl p-5 text-[color:var(--cream)] shadow-[var(--shadow-elegant)]"
            style={{ background: "var(--gradient-lesson)" }}
          >
            <p
              className="font-serif text-xl leading-tight"
              style={isRtl ? { fontFamily: "var(--font-arabic)", fontSize: "1.5rem" } : undefined}
            >
              {mockNextSession.dateLabel} · {mockNextSession.timeLabel}
            </p>
            <p
              className="mt-1 text-sm text-[color:var(--cream)]/85"
              style={isRtl ? { fontFamily: "var(--font-arabic)", fontSize: "1rem" } : undefined}
            >
              {t(mockNextSession.topicKey)}
            </p>
            <a
              href={mockNextSession.zoomUrl ?? "#"}
              className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--gold)] px-5 text-lg font-bold text-[color:var(--anthracite)] shadow-[var(--shadow-gold)] transition hover:bg-[color:var(--gold-soft)]"
              style={isRtl ? { fontFamily: "var(--font-arabic)" } : undefined}
            >
              <Video size={20} aria-hidden />
              <span>{t("join_session")}</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
