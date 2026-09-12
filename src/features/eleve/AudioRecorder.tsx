import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, RotateCcw, Send, Square } from "lucide-react";

type Phase = "idle" | "recording" | "recorded";

function formatTime(s: number) {
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const sec = Math.floor(s % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${sec}`;
}

export function AudioRecorder({
  onSend,
}: {
  onSend: (blob: Blob | null, durationSec: number) => void | Promise<void>;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [sending, setSending] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const blobRef = useRef<Blob | null>(null);

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      clearTimer();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startRecording() {
    setElapsed(0);
    setAudioUrl(null);
    setSimulated(false);

    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("no-media");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      rec.start();
      recorderRef.current = rec;
    } catch {
      setSimulated(true);
    }

    setPhase("recording");
    timerRef.current = setInterval(() => setElapsed((n) => n + 1), 1000);
  }

  function stopRecording() {
    clearTimer();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    setPhase("recorded");
  }

  function reset() {
    clearTimer();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setElapsed(0);
    setPlaying(false);
    setPhase("idle");
    setSimulated(false);
  }

  async function sendRecording() {
    setSending(true);
    try {
      await onSend(blobRef.current, elapsed);
      reset();
    } finally {
      setSending(false);
    }
  }

  function togglePlay() {
    const el = audioElRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play();
      setPlaying(true);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {phase === "idle" && (
        <>
          <button
            type="button"
            onClick={startRecording}
            aria-label="Démarrer l'enregistrement"
            className="flex h-40 w-40 items-center justify-center rounded-full text-[color:var(--cream)] shadow-[var(--shadow-elegant)] transition active:scale-95"
            style={{ background: "var(--gradient-lesson)" }}
          >
            <Mic size={64} aria-hidden />
          </button>
          <p className="font-[family-name:var(--font-display-kid)] text-lg font-bold text-[color:var(--deep-green)]">
            Appuie pour enregistrer
          </p>
        </>
      )}

      {phase === "recording" && (
        <>
          <div className="relative flex h-40 w-40 items-center justify-center">
            <span
              aria-hidden
              className="absolute inset-0 animate-ping rounded-full bg-[color:var(--gold)] opacity-40"
            />
            <button
              type="button"
              onClick={stopRecording}
              aria-label="Arrêter l'enregistrement"
              className="relative flex h-40 w-40 items-center justify-center rounded-full text-[color:var(--anthracite)] shadow-[var(--shadow-gold)]"
              style={{ background: "var(--gradient-gold)" }}
            >
              <Square size={48} fill="currentColor" aria-hidden />
            </button>
          </div>

          <div className="flex items-end gap-1" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="w-2 rounded-full bg-[color:var(--deep-green)]"
                style={{
                  height: `${12 + ((elapsed + i) % 4) * 8}px`,
                  transition: "height 200ms",
                }}
              />
            ))}
          </div>

          <p className="font-[family-name:var(--font-display-kid)] text-3xl font-bold text-[color:var(--deep-green)] tabular-nums">
            {formatTime(elapsed)}
          </p>
          {simulated && (
            <p className="text-xs text-muted-foreground">(Aperçu : micro non disponible ici)</p>
          )}
        </>
      )}

      {phase === "recorded" && (
        <div className="flex w-full flex-col items-center gap-5">
          <div className="flex w-full items-center gap-4 rounded-2xl border border-[color:var(--cream-2)] bg-card p-4 shadow-[var(--shadow-card)]">
            <button
              type="button"
              onClick={togglePlay}
              disabled={!audioUrl}
              aria-label={playing ? "Pause" : "Écouter"}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[color:var(--deep-green)] text-[color:var(--cream)] disabled:opacity-50"
            >
              {playing ? (
                <Pause size={22} aria-hidden />
              ) : (
                <Play size={22} fill="currentColor" aria-hidden />
              )}
            </button>
            <div className="flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-[color:var(--cream-2)]">
                <div
                  className="h-full rounded-full bg-[color:var(--gold)]"
                  style={{ width: playing ? "60%" : "100%" }}
                />
              </div>
              <p className="mt-2 font-[family-name:var(--font-display-kid)] text-lg font-bold text-[color:var(--deep-green)] tabular-nums">
                {formatTime(elapsed)}
              </p>
            </div>
            {audioUrl && (
              <audio
                ref={audioElRef}
                src={audioUrl}
                onEnded={() => setPlaying(false)}
                className="hidden"
              />
            )}
          </div>

          <div className="flex w-full gap-3">
            <button
              type="button"
              onClick={reset}
              className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-[color:var(--cream-2)] bg-card px-4 font-[family-name:var(--font-display-kid)] font-bold text-[color:var(--anthracite)]"
            >
              <RotateCcw size={18} aria-hidden />
              Recommencer
            </button>
            <button
              type="button"
              onClick={sendRecording}
              disabled={sending || !audioUrl}
              className="flex min-h-[52px] flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-[color:var(--deep-green)] px-4 font-[family-name:var(--font-display-kid)] text-lg font-bold text-[color:var(--cream)] shadow-[var(--shadow-elegant)] transition active:scale-[0.98]"
            >
              <Send size={18} aria-hidden />
              {sending ? "Envoi…" : "Envoyer au professeur"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
