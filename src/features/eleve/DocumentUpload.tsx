import { useRef, useState } from "react";
import { FileText, Send, Trash2, Upload } from "lucide-react";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export function DocumentUpload({ onSend }: { onSend: (file: File) => void | Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function selectFile(next: File | undefined) {
    setError(null);
    if (!next) return;
    if (next.type !== "application/pdf") {
      setError("Choisis un fichier PDF.");
      return;
    }
    if (next.size > MAX_FILE_SIZE) {
      setError("Le PDF ne doit pas dépasser 25 Mo.");
      return;
    }
    setFile(next);
  }

  async function send() {
    if (!file) return;
    setSending(true);
    setError(null);
    try {
      await onSend(file);
      setFile(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Le PDF n’a pas pu être envoyé.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => {
          selectFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-[color:var(--gold)] bg-card px-6 py-8 text-center shadow-[var(--shadow-card)] transition active:scale-[0.99]"
        >
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full text-[color:var(--anthracite)] shadow-[var(--shadow-gold)]"
            style={{ background: "var(--gradient-gold)" }}
          >
            <Upload size={34} aria-hidden />
          </div>
          <span className="font-[family-name:var(--font-display-kid)] text-xl font-bold text-[color:var(--deep-green)]">
            Choisir un fichier PDF
          </span>
          <span className="text-sm text-muted-foreground">Taille maximale : 25 Mo</span>
        </button>
      ) : (
        <div className="rounded-3xl border border-[color:var(--cream-2)] bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-[color:var(--cream-2)] text-[color:var(--deep-green)]">
              <FileText size={24} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(1)} Mo
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              aria-label="Retirer le PDF"
              className="grid size-10 place-items-center rounded-xl text-destructive"
            >
              <Trash2 size={18} aria-hidden />
            </button>
          </div>
          <button
            type="button"
            disabled={sending}
            onClick={send}
            className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--deep-green)] px-4 font-[family-name:var(--font-display-kid)] text-lg font-bold text-[color:var(--cream)] disabled:opacity-60"
          >
            <Send size={18} aria-hidden /> {sending ? "Envoi…" : "Envoyer au professeur"}
          </button>
        </div>
      )}
      {error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
