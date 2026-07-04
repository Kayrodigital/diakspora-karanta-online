import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { BottomNav } from "@/features/eleve/BottomNav";
import { VideoPlayer } from "@/features/eleve/VideoPlayer";
import { QuizQuestion } from "@/features/eleve/QuizQuestion";
import { mockLecon } from "@/features/eleve/lecon-mock-data";

export const Route = createFileRoute("/lecon")({
  head: () => ({
    meta: [
      { title: "Leçon — Diakspora Karanta" },
      {
        name: "description",
        content:
          "Regarde la vidéo de la leçon puis réponds au petit quiz pour valider ce que tu as appris.",
      },
    ],
  }),
  component: LeconPage,
});

type Phase = "video" | "quiz";

function LeconPage() {
  const { lessonTitle, durationSec, summary, videoEmoji, questions, badgeEmoji, badgeName } =
    mockLecon;
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("video");
  const [videoEnded, setVideoEnded] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const handleAnswer = (wasCorrect: boolean) => {
    if (wasCorrect) setCorrectCount((c) => c + 1);
    if (qIndex + 1 < questions.length) {
      setQIndex((i) => i + 1);
    } else {
      setFinished(true);
    }
  };

  return (
    <div className="min-h-screen bg-[color:var(--cream)] text-foreground">
      <div className="mx-auto max-w-md pb-28">
        <header className="px-5 pt-6">
          <Link
            to="/eleve"
            className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"
          >
            ← Espace élève
          </Link>
          <h1 className="mt-3 font-[family-name:var(--font-display-kid)] text-2xl font-bold leading-tight">
            {lessonTitle}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {phase === "video"
              ? "Regarde la vidéo, puis passe au petit quiz."
              : finished
              ? "C'est terminé, bravo !"
              : "Réponds aux questions à ton rythme."}
          </p>
        </header>

        {phase === "video" && (
          <section className="mt-5 px-5">
            <VideoPlayer
              title={lessonTitle}
              durationSec={durationSec}
              thumbnailEmoji={videoEmoji}
              onEnded={() => setVideoEnded(true)}
            />

            <div className="mt-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-elegant)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--gold-dark)]">
                Ce que tu vas apprendre
              </p>
              <p className="mt-2 font-[family-name:var(--font-display-kid)] text-lg font-bold text-foreground">
                {summary}
              </p>
            </div>

            {videoEnded && (
              <button
                type="button"
                onClick={() => setPhase("quiz")}
                className="mt-5 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--gold)] px-6 font-[family-name:var(--font-display-kid)] text-lg font-bold text-[color:var(--anthracite)] shadow-[var(--shadow-gold)] transition active:scale-[0.98]"
              >
                Passer au quiz
                <ArrowRight size={22} aria-hidden />
              </button>
            )}
          </section>
        )}

        {phase === "quiz" && !finished && (
          <section className="mt-5 px-5">
            <QuizQuestion
              key={questions[qIndex].id}
              question={questions[qIndex]}
              index={qIndex}
              total={questions.length}
              onNext={handleAnswer}
            />
          </section>
        )}

        {phase === "quiz" && finished && (
          <section className="mt-5 px-5">
            <div className="overflow-hidden rounded-3xl bg-card p-6 text-center shadow-[var(--shadow-elegant)]">
              <div
                aria-hidden
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-full text-5xl shadow-[var(--shadow-gold)]"
                style={{ background: "var(--gradient-gold)" }}
              >
                {badgeEmoji}
              </div>
              <p className="mt-4 font-[family-name:var(--font-display-kid)] text-2xl font-bold text-[color:var(--deep-green)]">
                Bravo, leçon terminée !
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Tu as trouvé {correctCount} bonnes réponses sur {questions.length}. Continue comme ça 💛
              </p>

              <div className="mt-5 rounded-2xl bg-[color:var(--gold)]/15 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--gold-dark)]">
                  Nouveau badge
                </p>
                <p className="mt-1 font-[family-name:var(--font-display-kid)] text-lg font-bold text-foreground">
                  {badgeName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate({ to: "/eleve" })}
                className="mt-6 flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-[color:var(--deep-green)] px-6 font-[family-name:var(--font-display-kid)] text-lg font-bold text-[color:var(--cream)] shadow-[var(--shadow-elegant)] transition active:scale-[0.98]"
              >
                Terminer la leçon
              </button>
            </div>
          </section>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
