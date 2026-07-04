import { useEffect, useState } from "react";
import { Play, Pause, FastForward } from "lucide-react";

type Props = {
  title: string;
  durationSec: number;
  thumbnailEmoji: string;
  onEnded: () => void;
};

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function VideoPlayer({ title, durationSec, thumbnailEmoji, onEnded }: Props) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const ended = elapsed >= durationSec;

  useEffect(() => {
    if (!playing || ended) return;
    const id = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        if (next >= durationSec) {
          setPlaying(false);
          onEnded();
          return durationSec;
        }
        return next;
      });
    }, 250); // sped up for demo
    return () => clearInterval(id);
  }, [playing, ended, durationSec, onEnded]);

  const skip = () => {
    setElapsed(durationSec);
    setPlaying(false);
    onEnded();
  };

  const pct = Math.min(100, (elapsed / durationSec) * 100);
  const remaining = Math.max(0, durationSec - elapsed);

  return (
    <div className="overflow-hidden rounded-3xl shadow-[var(--shadow-elegant)]">
      <div
        className="relative flex aspect-video items-center justify-center"
        style={{ background: "var(--gradient-lesson)" }}
      >
        <div aria-hidden className="text-7xl opacity-90">
          {thumbnailEmoji}
        </div>
        <button
          type="button"
          aria-label={playing ? "Mettre en pause" : "Lancer la vidéo"}
          onClick={() => setPlaying((p) => !p)}
          className="absolute flex h-20 w-20 items-center justify-center rounded-full bg-[color:var(--gold)] text-[color:var(--anthracite)] shadow-[var(--shadow-gold)] transition active:scale-95"
        >
          {playing ? <Pause size={32} aria-hidden /> : <Play size={32} fill="currentColor" aria-hidden />}
        </button>
      </div>
      <div className="bg-card p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-[family-name:var(--font-display-kid)] text-sm font-bold text-foreground">
            {title}
          </span>
          <span>
            {formatTime(elapsed)} / {formatTime(durationSec)}
            {!ended && (
              <span className="ml-2 text-[color:var(--gold-dark)]">
                (reste {formatTime(remaining)})
              </span>
            )}
          </span>
        </div>
        <div
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[color:var(--cream-2)]"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${pct}%`, background: "var(--gradient-gold)" }}
          />
        </div>
        {!ended && (
          <button
            type="button"
            onClick={skip}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--cream-2)] bg-[color:var(--cream)] px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <FastForward size={14} aria-hidden />
            Simuler la fin de la vidéo
          </button>
        )}
      </div>
    </div>
  );
}
