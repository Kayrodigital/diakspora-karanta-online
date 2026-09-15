import { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, RotateCcw, Send, X } from "lucide-react";

type Shot = { id: string; url: string; file: File };

export function PhotoCapture({ onSend }: { onSend: (files: File[]) => void | Promise<void> }) {
  const [shots, setShots] = useState<Shot[]>([]);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      shots.forEach((s) => URL.revokeObjectURL(s.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const next: Shot[] = [];
    for (const f of Array.from(files)) {
      next.push({ id: crypto.randomUUID(), url: URL.createObjectURL(f), file: f });
    }
    setShots((prev) => [...prev, ...next]);
  }

  function removeShot(id: string) {
    setShots((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((s) => s.id !== id);
    });
  }

  function reset() {
    shots.forEach((s) => URL.revokeObjectURL(s.url));
    setShots([]);
  }

  const hasShots = shots.length > 0;
  const main = shots[shots.length - 1];

  return (
    <div className="flex flex-col gap-5">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {!hasShots ? (
        <>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-[color:var(--gold)] bg-card px-6 py-8 text-center shadow-[var(--shadow-card)] transition active:scale-[0.99]"
          >
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full text-[color:var(--anthracite)] shadow-[var(--shadow-gold)]"
              style={{ background: "var(--gradient-gold)" }}
            >
              <Camera size={36} aria-hidden />
            </div>
            <span className="font-[family-name:var(--font-display-kid)] text-xl font-bold text-[color:var(--deep-green)]">
              Prendre une photo
            </span>
            <span className="text-sm text-muted-foreground">Prends ton cahier en photo</span>
          </button>

          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="mx-auto flex items-center gap-2 text-sm font-semibold text-[color:var(--deep-green)] underline underline-offset-4"
          >
            <ImageIcon size={16} aria-hidden />
            Choisir depuis la galerie
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-3xl border-2 border-[color:var(--cream-2)] bg-card">
            <img src={main.url} alt="Aperçu du devoir" className="h-72 w-full object-cover" />
          </div>

          <div className="flex flex-wrap gap-2">
            {shots.map((s) => (
              <div key={s.id} className="relative">
                <img
                  src={s.url}
                  alt=""
                  className="h-16 w-16 rounded-xl object-cover ring-2 ring-[color:var(--gold)]"
                />
                <button
                  type="button"
                  onClick={() => removeShot(s.id)}
                  aria-label="Supprimer cette photo"
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--anthracite)] text-[color:var(--cream)]"
                >
                  <X size={12} aria-hidden />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              aria-label="Ajouter une photo"
              className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-[color:var(--gold)] text-[color:var(--gold-dark)]"
            >
              <Camera size={22} aria-hidden />
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-[color:var(--cream-2)] bg-card px-4 font-[family-name:var(--font-display-kid)] font-bold text-[color:var(--anthracite)]"
            >
              <RotateCcw size={18} aria-hidden />
              Reprendre
            </button>
            <button
              type="button"
              onClick={() => {
                onSend(shots.map((s) => s.file));
                reset();
              }}
              className="flex min-h-[52px] flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-[color:var(--deep-green)] px-4 font-[family-name:var(--font-display-kid)] text-lg font-bold text-[color:var(--cream)] shadow-[var(--shadow-elegant)] transition active:scale-[0.98]"
            >
              <Send size={18} aria-hidden />
              Envoyer au professeur
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
