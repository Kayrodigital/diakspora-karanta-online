import type { AttendanceStatus } from "./mock-data";

type Props = { status: AttendanceStatus };

/**
 * Non-alarmist attendance status card.
 * Uses warm brand tones (deep green / amber / soft warm red)
 * rather than aggressive alert icons or bright red.
 */
export function AttendanceStatusBadge({ status }: Props) {
  const palette = getPalette(status.level);

  return (
    <section
      aria-label={`Statut d'assiduité : ${status.label}`}
      className="rounded-2xl border p-5 shadow-[var(--shadow-card)]"
      style={{
        background: palette.bg,
        borderColor: palette.border,
      }}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="inline-flex h-3 w-3 rounded-full"
          style={{ background: palette.dot }}
        />
        <p
          className="text-[10px] font-bold uppercase tracking-[0.22em]"
          style={{ color: palette.eyebrow }}
        >
          Statut d'assiduité
        </p>
      </div>
      <p
        className="mt-2 font-serif text-2xl"
        style={{ color: palette.title }}
      >
        {status.label}
      </p>
      {status.reason && status.level !== "regular" && (
        <p className="mt-1 text-sm text-muted-foreground">{status.reason}</p>
      )}
    </section>
  );
}

function getPalette(level: AttendanceStatus["level"]) {
  switch (level) {
    case "regular":
      return {
        bg: "color-mix(in oklab, var(--deep-green) 8%, var(--cream))",
        border: "color-mix(in oklab, var(--deep-green) 25%, transparent)",
        dot: "var(--deep-green)",
        eyebrow: "var(--deep-green)",
        title: "var(--deep-green)",
      };
    case "watch":
      return {
        bg: "color-mix(in oklab, var(--gold) 14%, var(--cream))",
        border: "color-mix(in oklab, var(--gold-dark) 35%, transparent)",
        dot: "var(--gold-dark)",
        eyebrow: "var(--gold-dark)",
        title: "var(--anthracite)",
      };
    case "risk":
    default:
      return {
        // Warm terracotta rather than bright red — stays inside the brand.
        bg: "color-mix(in oklab, #b4553a 12%, var(--cream))",
        border: "color-mix(in oklab, #b4553a 40%, transparent)",
        dot: "#b4553a",
        eyebrow: "#8a3f2a",
        title: "#8a3f2a",
      };
  }
}
