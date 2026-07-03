import type { SurahNode } from "./mock-data";

type Props = {
  node: SurahNode;
  isLast?: boolean;
  align?: "left" | "right";
};

/**
 * A single stop on the vertical Juz' 'Amma learning path.
 * Renders the circular badge + label + the connector line to the next node.
 */
export function LessonPathNode({ node, isLast = false, align = "left" }: Props) {
  const isDone = node.status === "done";
  const isCurrent = node.status === "current";

  const circleClass = isDone
    ? "bg-[color:var(--deep-green)] text-[color:var(--cream)] border-[color:var(--deep-green)]"
    : isCurrent
      ? "bg-[color:var(--gold)] text-[color:var(--anthracite)] border-[color:var(--gold-dark)] shadow-[var(--shadow-gold)] animate-pulse"
      : "bg-[color:var(--cream-2)] text-[color:var(--anthracite)]/40 border-[color:var(--cream-2)]";

  return (
    <li className="relative flex items-center gap-4" data-align={align}>
      {/* Connector to next node */}
      {!isLast && (
        <span
          aria-hidden
          className={`absolute left-[27px] top-14 h-10 w-[3px] rounded-full ${
            isDone ? "bg-[color:var(--deep-green)]" : "bg-[color:var(--cream-2)]"
          }`}
        />
      )}

      <div
        className={`relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 font-[family-name:var(--font-arabic)] text-2xl ${circleClass}`}
      >
        {isDone ? "✓" : node.arabicLetter}
      </div>

      <div className="min-w-0">
        <p
          className={`font-[family-name:var(--font-display-kid)] text-lg font-semibold ${
            isCurrent
              ? "text-[color:var(--deep-green)]"
              : isDone
                ? "text-foreground"
                : "text-muted-foreground"
          }`}
        >
          {node.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {isDone ? "Apprise ✨" : isCurrent ? "En cours" : "À venir"}
        </p>
      </div>
    </li>
  );
}
