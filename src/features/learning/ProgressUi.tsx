import { CheckCircle2, Circle, Clock3, ShieldCheck } from "lucide-react";
import type { SessionProgressStatus } from "./progress-data";

const labels: Record<SessionProgressStatus, string> = {
  not_started: "Non commencé",
  in_progress: "En cours",
  completed: "Terminé",
  validated: "Validé",
};

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs text-[#62675F]">
        <span>{label}</span>
        <span className="font-bold text-[#173F2B]">{safeValue}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-[#E5DDCE]"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
      >
        <div className="h-full rounded-full bg-[#2E6A48]" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

export function ProgressBadge({ status }: { status: SessionProgressStatus }) {
  const Icon =
    status === "validated"
      ? ShieldCheck
      : status === "completed"
        ? CheckCircle2
        : status === "in_progress"
          ? Clock3
          : Circle;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF4EF] px-2.5 py-1 text-xs font-bold text-[#285A3E]">
      <Icon className="size-3.5" aria-hidden="true" />
      {labels[status]}
    </span>
  );
}
