import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import type { QuizQuestion as QuizQuestionType } from "./lecon-mock-data";

type Props = {
  question: QuizQuestionType;
  index: number;
  total: number;
  onNext: (wasCorrect: boolean) => void;
};

export function QuizQuestion({ question, index, total, onNext }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const isCorrect = selected === question.correctIndex;

  const handleSelect = (i: number) => {
    if (answered) return;
    setSelected(i);
  };

  const handleNext = () => {
    onNext(isCorrect);
    setSelected(null);
  };

  const pct = ((index + 1) / total) * 100;

  return (
    <div className="rounded-3xl bg-card p-5 shadow-[var(--shadow-elegant)]">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--gold-dark)]">
          Question {index + 1}/{total}
        </span>
        <span aria-hidden className="text-lg">✨</span>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[color:var(--cream-2)]"
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${pct}%`, background: "var(--gradient-gold)" }}
        />
      </div>

      <h3 className="mt-5 font-[family-name:var(--font-display-kid)] text-xl font-bold leading-snug text-foreground">
        {question.question}
      </h3>

      <div className="mt-4 flex flex-col gap-2.5">
        {question.choices.map((choice, i) => {
          const isThis = selected === i;
          const isRight = i === question.correctIndex;
          let cls =
            "min-h-[56px] rounded-2xl border-2 px-4 py-3 text-left text-base font-[family-name:var(--font-display-kid)] font-bold transition";
          if (!answered) {
            cls +=
              " border-[color:var(--cream-2)] bg-[color:var(--cream)] text-foreground hover:border-[color:var(--gold)]";
          } else if (isRight) {
            cls +=
              " border-[color:var(--deep-green)] bg-[color:var(--deep-green)]/10 text-[color:var(--deep-green)]";
          } else if (isThis) {
            cls +=
              " border-[color:var(--gold-dark)] bg-[color:var(--gold)]/15 text-[color:var(--gold-dark)]";
          } else {
            cls +=
              " border-[color:var(--cream-2)] bg-[color:var(--cream)] text-muted-foreground opacity-70";
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(i)}
              disabled={answered}
              className={cls}
            >
              <span className="flex items-center gap-2">
                {answered && isRight && (
                  <Check size={18} className="text-[color:var(--deep-green)]" aria-hidden />
                )}
                {choice}
              </span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          className={`mt-4 rounded-2xl p-4 ${
            isCorrect
              ? "bg-[color:var(--deep-green)]/8 text-[color:var(--deep-green)]"
              : "bg-[color:var(--gold)]/15 text-[color:var(--gold-dark)]"
          }`}
        >
          <p className="flex items-start gap-2 font-[family-name:var(--font-display-kid)] text-sm font-bold">
            <Sparkles size={16} aria-hidden className="mt-0.5 shrink-0" />
            <span>
              {isCorrect ? "Bravo, c'est ça ! " : "Presque ! "}
              {question.explanation}
            </span>
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleNext}
        disabled={!answered}
        className="mt-5 flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-[color:var(--deep-green)] px-6 font-[family-name:var(--font-display-kid)] text-lg font-bold text-[color:var(--cream)] shadow-[var(--shadow-elegant)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {index + 1 === total ? "Voir mon résultat" : "Question suivante"}
      </button>
    </div>
  );
}
