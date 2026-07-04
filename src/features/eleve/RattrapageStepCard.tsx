import type { ReactNode } from "react";
import { Check, Lock, Play } from "lucide-react";
import type { RattrapageStep } from "./rattrapage-mock-data";

export type StepStatus = "done" | "current" | "locked";

type Props = {
  step: RattrapageStep;
  index: number;
  status: StepStatus;
  onStart?: () => void;
  actionLabel?: string;
  children?: ReactNode; // inline content when expanded (quiz / homework)
};

export function RattrapageStepCard({
  step,
  index,
  status,
  onStart,
  actionLabel,
  children,
}: Props) {
  const isDone = status === "done";
  const isLocked = status === "locked";
  const isCurrent = status === "current";

  return (
    <div
      className={`relative rounded-2xl border p-4 transition ${
        isDone
          ? "border-[color:var(--deep-green)]/25 bg-card"
          : isCurrent
            ? "border-[color:var(--gold)] bg-card shadow-[var(--shadow-card)]"
            : "border-[color:var(--cream-2)] bg-[color:var(--cream-2)]/40"
      }`}
      aria-current={isCurrent ? "step" : undefined}
    >
      <div className="flex items-start gap-3">
        {/* Step number / status circle */}
        <div
          aria-hidden
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-display-kid)] text-base font-bold ${
            isDone
              ? "bg-[color:var(--deep-green)] text-[color:var(--cream)]"
              : isCurrent
                ? "bg-[color:var(--gold)] text-[color:var(--anthracite)]"
                : "bg-[color:var(--cream-2)] text-muted-foreground"
          }`}
        >
          {isDone ? (
            <Check size={20} strokeWidth={3} />
          ) : isLocked ? (
            <Lock size={18} strokeWidth={2.4} />
          ) : (
            index + 1
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                className={`font-[family-name:var(--font-display-kid)] text-base font-bold leading-tight ${
                  isLocked ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                {step.thumbnailEmoji && (
                  <span aria-hidden className="mr-1.5">
                    {step.thumbnailEmoji}
                  </span>
                )}
                {step.title}
              </h3>
              {step.subtitle && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {step.subtitle}
                  {step.durationMin ? ` · ${step.durationMin} min` : ""}
                </p>
              )}
            </div>

            {isDone && (
              <span className="shrink-0 rounded-full bg-[color:var(--deep-green)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--deep-green)]">
                Fait
              </span>
            )}
          </div>

          {isCurrent && onStart && !children && (
            <button
              type="button"
              onClick={onStart}
              className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--deep-green)] px-4 font-[family-name:var(--font-display-kid)] text-sm font-bold text-[color:var(--cream)] transition active:scale-[0.98] hover:bg-[color:var(--deep-green-hi)]"
            >
              <Play size={16} fill="currentColor" aria-hidden />
              {actionLabel ?? "Commencer"}
            </button>
          )}

          {isCurrent && children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}
