import type { Recommendation } from "./mock-data";

type Props = { recommendation: Recommendation };

export function RecommendationCard({ recommendation }: Props) {
  return (
    <article className="flex items-start gap-3 rounded-2xl border border-[color:var(--cream-2)] bg-card p-4 shadow-[var(--shadow-card)]">
      <div
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
        style={{
          background: "color-mix(in oklab, var(--gold) 20%, var(--cream))",
        }}
      >
        {recommendation.emoji}
      </div>
      <p className="text-sm leading-relaxed text-foreground">
        {recommendation.message}
      </p>
    </article>
  );
}
