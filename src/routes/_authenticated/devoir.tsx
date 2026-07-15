import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, CheckCircle2, Mic, Send } from "lucide-react";
import { PhotoCapture } from "@/features/eleve/PhotoCapture";
import { AudioRecorder } from "@/features/eleve/AudioRecorder";
import { BottomNav } from "@/features/eleve/BottomNav";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/devoir")({
  head: () => ({
    meta: [{ title: "Rendre un devoir — Diakspora Karanta" }],
  }),
  component: DevoirPage,
});

type Tab = "photo" | "audio";

async function fetchHistory() {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return [];
  const { data } = await supabase
    .from("homework_submissions")
    .select("id, type, status, created_at, feedback_text")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(10);
  return data ?? [];
}

async function uploadFile(file: Blob, ext: string): Promise<string> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user!.id;
  const path = `${uid}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("homework").upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

async function insertSubmission(fileUrl: string, type: "photo" | "audio") {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user!.id;
  const { error } = await supabase.from("homework_submissions").insert({
    user_id: uid,
    type,
    file_url: fileUrl,
    status: "envoye",
  });
  if (error) throw error;
}

function DevoirPage() {
  const [tab, setTab] = useState<Tab>("photo");
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();
  const { data: history } = useQuery({ queryKey: ["homework-history"], queryFn: fetchHistory });

  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(() => setSent(null), 3500);
    return () => clearTimeout(t);
  }, [sent]);

  async function handlePhotos(files: File[]) {
    setError(null);
    try {
      for (const f of files) {
        const ext = f.name.split(".").pop() || "jpg";
        const path = await uploadFile(f, ext);
        await insertSubmission(path, "photo");
      }
      setSent(`${files.length} photo(s) envoyée(s) 🌟`);
      qc.invalidateQueries({ queryKey: ["homework-history"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'envoi");
    }
  }

  async function handleAudio(blob: Blob | null) {
    setError(null);
    try {
      if (!blob) {
        setSent("Audio envoyé (simulé) 🌟");
        return;
      }
      const ext = (blob.type.split("/")[1] || "webm").split(";")[0];
      const path = await uploadFile(blob, ext);
      await insertSubmission(path, "audio");
      setSent("Audio envoyé 🌟");
      qc.invalidateQueries({ queryKey: ["homework-history"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'envoi");
    }
  }

  return (
    <div className="min-h-screen bg-[color:var(--cream)] text-foreground">
      <div className="mx-auto max-w-md pb-28">
        <header className="px-5 pt-6">
          <Link to="/eleve" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            ← Retour
          </Link>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--gold-dark)]">
            Mon devoir
          </p>
          <h1 className="font-[family-name:var(--font-display-kid)] text-2xl font-bold leading-tight">
            Envoyer mon devoir
          </h1>
        </header>

        <div role="tablist" className="mx-5 mt-5 grid grid-cols-2 rounded-2xl bg-[color:var(--cream-2)] p-1">
          {(["photo", "audio"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl font-[family-name:var(--font-display-kid)] font-bold ${
                tab === t ? "bg-[color:var(--deep-green)] text-[color:var(--cream)]" : "text-[color:var(--anthracite)]"
              }`}
            >
              {t === "photo" ? <Camera size={18} /> : <Mic size={18} />}
              {t === "photo" ? "Photo" : "Audio"}
            </button>
          ))}
        </div>

        {sent && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-2xl border border-[color:var(--gold)] bg-[color:var(--gold)]/15 px-4 py-3 text-sm font-semibold text-[color:var(--deep-green)]">
            <Send size={16} aria-hidden />
            {sent}
          </div>
        )}
        {error && (
          <div className="mx-5 mt-4 rounded-2xl bg-[color:var(--gold)]/20 px-4 py-3 text-sm text-[color:var(--anthracite)]">
            {error}
          </div>
        )}

        <section className="mt-6 px-5">
          {tab === "photo" ? (
            <PhotoCapture onSend={handlePhotos} />
          ) : (
            <AudioRecorder onSend={handleAudio} />
          )}
        </section>

        <section className="mt-10 px-5">
          <h2 className="font-[family-name:var(--font-display-kid)] text-xl font-bold">
            Mes devoirs envoyés
          </h2>
          {history && history.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-2">
              {history.map((h) => {
                const graded = h.status === "corrige";
                return (
                  <li
                    key={h.id}
                    className="flex items-center gap-3 rounded-2xl border border-[color:var(--cream-2)] bg-card p-3 shadow-[var(--shadow-card)]"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[color:var(--cream-2)] text-[color:var(--deep-green)]">
                      {h.type === "photo" ? <Camera size={22} /> : <Mic size={22} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-[family-name:var(--font-display-kid)] font-bold">
                        Devoir {h.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {h.created_at ? new Date(h.created_at).toLocaleDateString("fr-FR") : ""}
                      </p>
                      {h.feedback_text && (
                        <p className="mt-1 text-xs font-semibold text-[color:var(--deep-green)]">
                          {h.feedback_text}
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
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Aucun devoir envoyé pour l'instant.</p>
          )}
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
