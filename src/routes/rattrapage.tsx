import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Camera, Check } from "lucide-react";
import { BottomNav } from "@/features/eleve/BottomNav";
import {
  RattrapageStepCard,
  type StepStatus,
} from "@/features/eleve/RattrapageStepCard";
import { mockRattrapage } from "@/features/eleve/rattrapage-mock-data";

export const Route = createFileRoute("/rattrapage")({
  head: () => ({
    meta: [
      { title: "Rattrapage — Diakspora Karanta" },
      {
        name: "description",
        content:
          "Reprends tranquillement ta leçon manquée, à ton rythme, étape par étape.",
      },
    ],
  }),
  component: RattrapagePage,
});

function RattrapagePage() {
  const { lessonTitle, steps, quiz, encouragement } = mockRattrapage;

  // Mock: first two steps already done.
  const [completed, setCompleted] = useState<Record<string, boolean>>({
    [steps[0].id]: true,
    [steps[1].id]: true,
  });

  const currentIndex = useMemo(
    () => steps.findIndex((s) => !completed[s.id]),
    [steps, completed],
  );
  const doneCount = steps.filter((s) => completed[s.id]).length;
  const allDone = doneCount === steps.length;

  const complete = (id: string) =>
    setCompleted((prev) => ({ ...prev, [id]: true }));

  return (
    <div className="min-h-screen bg-[color:var(--cream)] text-foreground">
      <div className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-5xl pb-40">
        {/* Header */}
        <header className="px-5 pt-6">
          <Link
            to="/eleve"
            className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"
          >
            ← Espace élève
          </Link>
          <h1 className="mt-3 font-[family-name:var(--font-display-kid)] text-2xl font-bold leading-tight text-foreground">
            {lessonTitle}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            À ton rythme, une étape à la fois.
          </p>
        </header>

        {/* Progress */}
        <section className="mt-5 px-5" aria-label="Progression du rattrapage">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--gold-dark)]">
              Progression
            </span>
            <span className="font-[family-name:var(--font-display-kid)] text-sm font-bold text-foreground">
              {doneCount}/{steps.length} étapes
            </span>
          </div>
          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[color:var(--cream-2)]"
            role="progressbar"
            aria-valuenow={doneCount}
            aria-valuemin={0}
            aria-valuemax={steps.length}
          >
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${(doneCount / steps.length) * 100}%`,
                background: "var(--gradient-gold)",
              }}
            />
          </div>
        </section>

        {/* Steps */}
        <section className="mt-6 flex flex-col gap-3 px-5">
          {steps.map((step, i) => {
            const status: StepStatus = completed[step.id]
              ? "done"
              : i === currentIndex
                ? "current"
                : "locked";

            if (step.kind === "video") {
              return (
                <RattrapageStepCard
                  key={step.id}
                  step={step}
                  index={i}
                  status={status}
                  actionLabel="Regarder"
                  onStart={() => complete(step.id)}
                />
              );
            }

            if (step.kind === "pdf") {
              return (
                <RattrapageStepCard
                  key={step.id}
                  step={step}
                  index={i}
                  status={status}
                >
                  <button
                    type="button"
                    onClick={() => complete(step.id)}
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--deep-green)] px-4 font-[family-name:var(--font-display-kid)] text-sm font-bold text-[color:var(--cream)] transition active:scale-[0.98] hover:bg-[color:var(--deep-green-hi)]"
                  >
                    <Download size={16} aria-hidden />
                    Télécharger le PDF
                  </button>
                </RattrapageStepCard>
              );
            }

            if (step.kind === "quiz") {
              return (
                <RattrapageStepCard
                  key={step.id}
                  step={step}
                  index={i}
                  status={status}
                >
                  <QuizFlow
                    questions={quiz}
                    onDone={() => complete(step.id)}
                  />
                </RattrapageStepCard>
              );
            }

            // homework
            return (
              <RattrapageStepCard
                key={step.id}
                step={step}
                index={i}
                status={status}
              >
                <HomeworkForm onDone={() => complete(step.id)} />
              </RattrapageStepCard>
            );
          })}
        </section>
      </div>

      {/* Fixed footer with validate button */}
      <div
        className="fixed inset-x-0 bottom-[64px] z-20 border-t border-[color:var(--cream-2)] bg-[color:var(--cream)]/95 px-5 py-3 backdrop-blur"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <div className="mx-auto w-full max-w-md md:max-w-2xl">
          <button
            type="button"
            disabled={!allDone}
            className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-6 font-[family-name:var(--font-display-kid)] text-lg font-bold transition ${
              allDone
                ? "bg-[color:var(--gold)] text-[color:var(--anthracite)] shadow-[var(--shadow-gold)] active:scale-[0.98] hover:bg-[color:var(--gold-soft)]"
                : "cursor-not-allowed bg-[color:var(--cream-2)] text-muted-foreground"
            }`}
          >
            {allDone && <Check size={20} strokeWidth={3} aria-hidden />}
            Valider et continuer
          </button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {encouragement}
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

/* ---------- Quiz ---------- */

function QuizFlow({
  questions,
  onDone,
}: {
  questions: typeof mockRattrapage.quiz;
  onDone: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = questions[idx];
  const isLast = idx === questions.length - 1;

  const next = () => {
    setPicked(null);
    if (isLast) onDone();
    else setIdx((i) => i + 1);
  };

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--gold-dark)]">
        Question {idx + 1}/{questions.length}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display-kid)] text-base font-bold text-foreground">
        {q.question}
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {q.choices.map((choice, ci) => {
          const selected = picked === ci;
          return (
            <li key={ci}>
              <button
                type="button"
                onClick={() => setPicked(ci)}
                className={`flex min-h-[44px] w-full items-center gap-2 rounded-xl border px-3 text-left text-sm font-medium transition ${
                  selected
                    ? "border-[color:var(--gold)] bg-[color:var(--gold)]/15 text-foreground"
                    : "border-[color:var(--cream-2)] bg-card text-foreground hover:border-[color:var(--gold-soft)]"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    selected
                      ? "border-[color:var(--gold-dark)] bg-[color:var(--gold)]"
                      : "border-[color:var(--cream-2)]"
                  }`}
                >
                  {selected && (
                    <Check size={12} strokeWidth={3} className="text-[color:var(--anthracite)]" />
                  )}
                </span>
                {choice}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        disabled={picked === null}
        onClick={next}
        className={`mt-3 flex min-h-[44px] w-full items-center justify-center rounded-xl px-4 font-[family-name:var(--font-display-kid)] text-sm font-bold transition ${
          picked === null
            ? "cursor-not-allowed bg-[color:var(--cream-2)] text-muted-foreground"
            : "bg-[color:var(--deep-green)] text-[color:var(--cream)] active:scale-[0.98] hover:bg-[color:var(--deep-green-hi)]"
        }`}
      >
        {isLast ? "Terminer le quiz" : "Question suivante"}
      </button>
    </div>
  );
}

/* ---------- Homework ---------- */

function HomeworkForm({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState("");
  const canSend = text.trim().length > 0;

  return (
    <div>
      <label
        htmlFor="homework-text"
        className="text-xs font-medium text-muted-foreground"
      >
        Écris ta phrase :
      </label>
      <textarea
        id="homework-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Ma phrase..."
        className="mt-1 w-full resize-none rounded-xl border border-[color:var(--cream-2)] bg-card p-3 text-sm text-foreground outline-none focus:border-[color:var(--gold)]"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => onDone()}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-[color:var(--gold)] bg-card px-3 text-sm font-bold text-[color:var(--gold-dark)] transition active:scale-[0.98]"
        >
          <Camera size={16} aria-hidden />
          Envoyer une photo
        </button>
        <button
          type="button"
          disabled={!canSend}
          onClick={onDone}
          className={`flex min-h-[44px] flex-1 items-center justify-center rounded-xl px-3 font-[family-name:var(--font-display-kid)] text-sm font-bold transition ${
            canSend
              ? "bg-[color:var(--deep-green)] text-[color:var(--cream)] active:scale-[0.98] hover:bg-[color:var(--deep-green-hi)]"
              : "cursor-not-allowed bg-[color:var(--cream-2)] text-muted-foreground"
          }`}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
