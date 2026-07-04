import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, CheckCircle2, Mic, Send } from "lucide-react";
import { PhotoCapture } from "@/features/eleve/PhotoCapture";
import { AudioRecorder } from "@/features/eleve/AudioRecorder";
import { BottomNav } from "@/features/eleve/BottomNav";
import { mockDevoir, mockDevoirHistory } from "@/features/eleve/devoir-mock-data";

export const Route = createFileRoute("/devoir")({
  head: () => ({
    meta: [
      { title: "Rendre un devoir — Diakspora Karanta" },
      { name: "description", content: "Envoie ton devoir en photo ou en audio à ton professeur." },
    ],
  }),
  component: DevoirPage,
});

type Tab = "photo" | "audio";

function DevoirPage() {
  const [tab, setTab] = useState<Tab>("photo");
  const [sent, setSent] = useState<string | null>(null);

  function handleSend(kind: "photo" | "audio") {
    setSent(kind === "photo" ? "Photos envoyées 🌟" : "Audio envoyé 🌟");
    setTimeout(() => setSent(null), 3500);
  }

  return (
    <div className="min-h-screen bg-[color:var(--cream)] text-foreground">
      <div className="mx-auto max-w-md pb-28">
        {/* Header */}
        <header className="px-5 pt-6">
          <Link
            to="/eleve"
            className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"
          >
            ← Retour
          </Link>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--gold-dark)]">
            Mon devoir
          </p>
          <h1 className="font-[family-name:var(--font-display-kid)] text-2xl font-bold leading-tight text-foreground">
            {mockDevoir.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{mockDevoir.subtitle}</p>
        </header>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Type de devoir"
          className="mx-5 mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-card p-1.5 shadow-[var(--shadow-card)]"
        >
          {(["photo", "audio"] as const).map((t) => {
            const active = tab === t;
            const Icon = t === "photo" ? Camera : Mic;
            return (
              <button
                key={t}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setTab(t)}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl font-[family-name:var(--font-display-kid)] text-base font-bold transition ${
                  active
                    ? "bg-[color:var(--deep-green)] text-[color:var(--cream)] shadow-[var(--shadow-elegant)]"
                    : "text-[color:var(--anthracite)]"
                }`}
              >
                <Icon size={18} aria-hidden />
                {t === "photo" ? "Photo" : "Audio"}
              </button>
            );
          })}
        </div>

        {/* Confirmation toast */}
        {sent && (
          <div
            role="status"
            className="mx-5 mt-4 flex items-center gap-2 rounded-2xl border border-[color:var(--gold)] bg-[color:var(--gold)]/15 px-4 py-3 text-sm font-semibold text-[color:var(--deep-green)]"
          >
            <Send size={16} aria-hidden />
            {sent}
          </div>
        )}

        {/* Active tab */}
        <section className="mt-6 px-5">
          {tab === "photo" ? (
            <PhotoCapture onSend={() => handleSend("photo")} />
          ) : (
            <AudioRecorder onSend={() => handleSend("audio")} />
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Ton professeur va {tab === "photo" ? "regarder" : "écouter"} et te répondre bientôt 💛
          </p>
        </section>

        {/* Historique */}
        <section className="mt-10 px-5">
          <h2 className="font-[family-name:var(--font-display-kid)] text-xl font-bold text-foreground">
            Mes devoirs envoyés
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {mockDevoirHistory.map((h) => {
              const graded = h.status === "graded";
              return (
                <li
                  key={h.id}
                  className="flex items-center gap-3 rounded-2xl border border-[color:var(--cream-2)] bg-card p-3 shadow-[var(--shadow-card)]"
                >
                  <div
                    aria-hidden
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[color:var(--cream-2)] text-[color:var(--deep-green)]"
                  >
                    {h.kind === "photo" ? <Camera size={22} /> : <Mic size={22} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-[family-name:var(--font-display-kid)] font-bold text-foreground">
                      {h.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{h.date}</p>
                    {h.note && (
                      <p className="mt-1 text-xs font-semibold text-[color:var(--deep-green)]">
                        {h.note}
                      </p>
                    )}
                  </div>
                  <span
                    className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                      graded
                        ? "bg-[color:var(--deep-green)] text-[color:var(--cream)]"
                        : "bg-[color:var(--gold)]/25 text-[color:var(--gold-dark)]"
                    }`}
                  >
                    {graded && <CheckCircle2 size={12} aria-hidden />}
                    {graded ? "Corrigé" : "Envoyé"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
