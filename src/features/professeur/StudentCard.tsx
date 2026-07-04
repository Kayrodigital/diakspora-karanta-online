import { MessageCircle } from "lucide-react";
import type { StudentSummary } from "./mock-data";
import { makeT, type Lang } from "./i18n";
import { getAttendancePalette } from "./palette";

type Props = {
  student: StudentSummary;
  lang: Lang;
};

export function StudentCard({ student, lang }: Props) {
  const t = makeT(lang);
  const isRtl = lang === "ar";
  const palette = getAttendancePalette(student.attendance);

  const statusLabel =
    student.attendance === "regular"
      ? t("status_regular")
      : student.attendance === "watch"
        ? t("status_watch")
        : t("status_risk");

  const lastActivity =
    student.lastActivityDaysAgo === 0
      ? t("last_activity_today")
      : t("last_activity_days", { n: student.lastActivityDaysAgo });

  const pending =
    student.pendingHomework === 0
      ? t("no_pending")
      : t("pending_homework", { n: student.pendingHomework });

  return (
    <article className="rounded-2xl border border-[color:var(--cream-2)] bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3">
        <div
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-[color:var(--anthracite)]"
          style={{ background: "var(--gradient-gold)" }}
        >
          {student.firstName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="truncate font-serif text-lg text-foreground"
            style={isRtl ? { fontFamily: "var(--font-arabic)" } : undefined}
          >
            {student.firstName}
          </p>
          <p
            className="mt-0.5 text-xs text-muted-foreground"
            style={isRtl ? { fontFamily: "var(--font-arabic)", fontSize: "0.85rem" } : undefined}
          >
            {lastActivity}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full border px-3 py-1 text-xs font-bold"
          style={{
            background: palette.bg,
            borderColor: palette.border,
            color: palette.fg,
            fontFamily: isRtl ? "var(--font-arabic)" : undefined,
            fontSize: isRtl ? "0.85rem" : undefined,
          }}
        >
          {statusLabel}
        </span>
      </div>

      <p
        className="mt-3 text-sm text-muted-foreground"
        style={isRtl ? { fontFamily: "var(--font-arabic)", fontSize: "0.95rem" } : undefined}
      >
        {pending}
      </p>

      <button
        type="button"
        className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--deep-green)] px-4 font-bold text-[color:var(--cream)] transition active:scale-[0.98] hover:bg-[color:var(--deep-green-hi)]"
        style={isRtl ? { fontFamily: "var(--font-arabic)", fontSize: "1rem" } : undefined}
      >
        <MessageCircle size={18} aria-hidden />
        <span>{t("contact_button")}</span>
      </button>
    </article>
  );
}
