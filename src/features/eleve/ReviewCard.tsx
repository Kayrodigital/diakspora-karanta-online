import type { ReviewItem } from "./mock-data";

type Props = { review: ReviewItem };

export function ReviewCard({ review }: Props) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-2xl border border-[color:var(--cream-2)] bg-card p-4 text-left shadow-[var(--shadow-card)] transition active:scale-[0.98]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--cream-2)] text-xl">
        🔁
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-[family-name:var(--font-display-kid)] text-base font-semibold text-foreground">
          {review.title}
        </p>
        <p className="text-xs text-muted-foreground">Révision espacée</p>
      </div>
      <span className="shrink-0 rounded-full bg-[color:var(--gold)]/25 px-3 py-1 text-xs font-bold text-[color:var(--gold-dark)]">
        {review.spacing}
      </span>
    </button>
  );
}
