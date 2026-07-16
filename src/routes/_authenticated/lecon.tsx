import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { z } from "zod";
import { BottomNav } from "@/features/eleve/BottomNav";
import { VideoPlayer } from "@/features/eleve/VideoPlayer";
import { QuizQuestion } from "@/features/eleve/QuizQuestion";
import { mockLecon } from "@/features/eleve/lecon-mock-data";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({ id: z.string().optional() });

export const Route = createFileRoute("/_authenticated/lecon")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "Leçon — Diakspora Karanta" }],
  }),
  component: LeconPage,
});

type Phase = "video" | "quiz";

async function loadLesson(id: string | undefined) {
  let query = supabase.from("lessons").select("id, title, duration_minutes, video_url");
  if (id) query = query.eq("id", id);
  else query = query.order("order_index", { ascending: true });
  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

function LeconPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: lesson } = useSuspenseQuery({
    queryKey: ["lesson", id ?? "first"],
    queryFn: () => loadLesson(id),
  });

  const { questions, badgeEmoji, badgeName } = mockLecon;
  const [phase, setPhase] = useState<Phase>("video");
  const [videoEnded, setVideoEnded] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  async function saveResults(finalCorrect: number) {
    if (!lesson) return;
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return;
      const score = Math.round((finalCorrect / questions.length) * 100);
      await supabase.from("quiz_results").insert({
        user_id: uid,
        lesson_id: lesson.id,
        score,
      });
      // Upsert progress: check if exists, else insert
      const { data: existing } = await supabase
        .from("progress")
        .select("id")
        .eq("user_id", uid)
        .eq("lesson_id", lesson.id)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("progress")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("progress").insert({
          user_id: uid,
          lesson_id: lesson.id,
          status: "completed",
          completed_at: new Date().toISOString(),
        });
      }
      qc.invalidateQueries({ queryKey: ["eleve-dashboard"] });
    } finally {
      setSaving(false);
    }
  }

  const handleAnswer = (wasCorrect: boolean) => {
    const nextCorrect = wasCorrect ? correctCount + 1 : correctCount;
    if (wasCorrect) setCorrectCount(nextCorrect);
    if (qIndex + 1 < questions.length) {
      setQIndex((i) => i + 1);
    } else {
      setFinished(true);
      void saveResults(nextCorrect);
    }
  };

  if (!lesson) {
    return (
      <div className="min-h-screen bg-[color:var(--cream)] p-6 text-center">
        <p>Aucune leçon disponible.</p>
        <Link to="/eleve" className="mt-4 inline-block text-[color:var(--deep-green)] underline">
          Retour
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--cream)] text-foreground">
      <div className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-5xl pb-28">
        <header className="px-5 pt-6">
          <Link to="/eleve" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            ← Espace élève
          </Link>
          <h1 className="mt-3 font-[family-name:var(--font-display-kid)] text-2xl font-bold leading-tight">
            {lesson.title}
          </h1>
        </header>

        {phase === "video" && (
          <section className="mt-5 px-5">
            <VideoPlayer
              title={lesson.title}
              durationSec={(lesson.duration_minutes ?? 5) * 60}
              thumbnailEmoji="🎥"
              onEnded={() => setVideoEnded(true)}
            />

            {videoEnded && (
              <button
                type="button"
                onClick={() => setPhase("quiz")}
                className="mt-5 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--gold)] px-6 font-[family-name:var(--font-display-kid)] text-lg font-bold text-[color:var(--anthracite)] shadow-[var(--shadow-gold)]"
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
            <div className="rounded-3xl bg-card p-6 text-center shadow-[var(--shadow-elegant)]">
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
                {correctCount} bonnes réponses sur {questions.length}. {saving && "Sauvegarde…"}
              </p>
              <div className="mt-5 rounded-2xl bg-[color:var(--gold)]/15 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--gold-dark)]">
                  Nouveau badge
                </p>
                <p className="mt-1 font-[family-name:var(--font-display-kid)] text-lg font-bold">
                  {badgeName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate({ to: "/eleve" })}
                className="mt-6 flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-[color:var(--deep-green)] px-6 font-[family-name:var(--font-display-kid)] text-lg font-bold text-[color:var(--cream)]"
              >
                Terminer
              </button>
            </div>
          </section>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
