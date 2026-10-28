import {
  CheckCircle2,
  CloudUpload,
  GripVertical,
  Loader2,
  RotateCcw,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { uploadMajlissAudio, type MajlissUploadDestination } from "./assistant-ingestion";
import { validateAudioFile } from "./audio-validation";

export type UploadOption = { id: string; label: string; destination: MajlissUploadDestination };

type UploadRow = {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
  durationSeconds?: number;
  progress: number;
  status: "ready" | "uploading" | "done" | "error";
  error?: string;
};

type Props = {
  options: UploadOption[];
  onComplete?: () => void | Promise<void>;
};

function initialTitle(file: File) {
  return file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

export function MajlissAudioUploader({ options, onComplete }: Props) {
  const [destinationId, setDestinationId] = useState("");
  const [recordedOn, setRecordedOn] = useState("");
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [batchError, setBatchError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const urls = useRef(new Set<string>());
  const selected =
    options.find((option) => option.id === destinationId) ??
    (options.length === 1 ? options[0] : undefined);

  useEffect(() => {
    const allocated = urls.current;
    return () => allocated.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const addFiles = (files: FileList | File[]) => {
    const incoming: UploadRow[] = [];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      try {
        validateAudioFile(file);
        const previewUrl = URL.createObjectURL(file);
        urls.current.add(previewUrl);
        incoming.push({
          id: crypto.randomUUID(),
          file,
          previewUrl,
          title: initialTitle(file),
          progress: 0,
          status: "ready",
        });
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "Fichier non pris en charge.");
      }
    }
    setRows((current) => [...current, ...incoming]);
    setBatchError(errors.join(" "));
    if (fileInput.current) fileInput.current.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
  };

  const updateRow = (id: string, patch: Partial<UploadRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    setRows((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      if (current[index].status === "done" || current[target].status === "done") return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeRow = (id: string) => {
    const row = rows.find((item) => item.id === id);
    if (!row || row.status === "uploading") return;
    URL.revokeObjectURL(row.previewUrl);
    urls.current.delete(row.previewUrl);
    setRows((current) => current.filter((item) => item.id !== id));
  };

  const reset = () => {
    for (const row of rows) {
      URL.revokeObjectURL(row.previewUrl);
      urls.current.delete(row.previewUrl);
    }
    setRows([]);
    setBatchError("");
    setRecordedOn("");
  };

  const send = async () => {
    if (!selected) return;
    const pending = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.status !== "done");
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(3, pending.length) }, async () => {
        while (next < pending.length) {
          const { row, index } = pending[next++];
          updateRow(row.id, { status: "uploading", error: undefined });
          try {
            await uploadMajlissAudio({
              uploadId: row.id,
              file: row.file,
              title: row.title,
              durationSeconds: row.durationSeconds,
              orderIndex: index + 1,
              recordedOn,
              destination: selected.destination,
              onProgress: (progress) => updateRow(row.id, { progress }),
            });
            updateRow(row.id, { progress: 100, status: "done" });
          } catch (error) {
            updateRow(row.id, {
              status: "error",
              error: error instanceof Error ? error.message : "Échec de l’envoi.",
            });
          }
        }
      }),
    );
    await onComplete?.();
  };

  const uploading = rows.some((row) => row.status === "uploading");
  const pending = rows.some((row) => row.status === "ready" || row.status === "error");

  return (
    <div className="space-y-5">
      {!options.length ? (
        <div className="rounded-xl border p-5 text-sm text-muted-foreground">
          <WifiOff className="mb-2 size-5" aria-hidden="true" />
          Aucun couple village–professeur autorisé. Demandez une affectation avant le dépôt.
        </div>
      ) : (
        <>
          <div className="grid gap-2">
            <Label htmlFor="majliss-destination">Village et professeur</Label>
            <select
              id="majliss-destination"
              value={selected?.id ?? ""}
              onChange={(event) => setDestinationId(event.target.value)}
              disabled={uploading || rows.some((row) => row.status === "done")}
              className="min-h-12 rounded-md border bg-background px-3 text-sm"
            >
              {options.length > 1 ? <option value="">Choisir une destination</option> : null}
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`rounded-xl border-2 border-dashed p-5 text-center ${dragging ? "border-primary bg-primary/5" : "border-border"}`}
          >
            <CloudUpload className="mx-auto mb-2 size-7 text-primary" aria-hidden="true" />
            <Label htmlFor="majliss-audio-files" className="block font-medium">
              Ajouter des vocaux ou fichiers audio
            </Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Sélection multiple sur téléphone ou glisser-déposer sur ordinateur · 500 Mo maximum
              par fichier · MP3, M4A, OGG, OPUS, AAC, WAV
            </p>
            <Input
              ref={fileInput}
              id="majliss-audio-files"
              type="file"
              multiple
              accept=".mp3,.m4a,.ogg,.opus,.aac,.wav,audio/*"
              className="mt-4 min-h-12 file:mr-3"
              onChange={(event) => event.target.files && addFiles(event.target.files)}
            />
          </div>
          {batchError ? (
            <p role="alert" className="text-sm text-destructive">
              {batchError}
            </p>
          ) : null}
          {rows.length ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="majliss-recorded-on">Date du cours (facultative)</Label>
                <Input
                  id="majliss-recorded-on"
                  type="date"
                  value={recordedOn}
                  onChange={(event) => setRecordedOn(event.target.value)}
                  disabled={uploading}
                />
              </div>
              <ol className="space-y-3" aria-label="Parties audio à déposer">
                {rows.map((row, index) => (
                  <li key={row.id} className="space-y-3 rounded-xl border p-4">
                    <div className="flex items-start gap-2">
                      <GripVertical
                        className="mt-1 size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          Partie {index + 1} · {row.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(row.file.size / 1024 / 1024).toFixed(1)} Mo ·{" "}
                          {row.file.type || "format audio"}
                        </p>
                      </div>
                      {row.status === "done" ? (
                        <CheckCircle2 className="size-5 text-emerald-600" aria-label="Envoyé" />
                      ) : null}
                      {row.status === "uploading" ? (
                        <Loader2 className="size-5 animate-spin" aria-label="Envoi en cours" />
                      ) : null}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`majliss-title-${row.id}`}>
                        Titre de la partie {index + 1}
                      </Label>
                      <Input
                        id={`majliss-title-${row.id}`}
                        value={row.title}
                        maxLength={240}
                        onChange={(event) => updateRow(row.id, { title: event.target.value })}
                        disabled={row.status === "done" || uploading}
                      />
                    </div>
                    <audio
                      controls
                      preload="metadata"
                      src={row.previewUrl}
                      className="w-full"
                      aria-label={`Préécoute de la partie ${index + 1}`}
                      onLoadedMetadata={(event) => {
                        const seconds = Math.round(event.currentTarget.duration);
                        if (
                          Number.isFinite(seconds) &&
                          seconds >= 0 &&
                          seconds !== row.durationSeconds
                        )
                          updateRow(row.id, { durationSeconds: seconds });
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => moveRow(index, -1)}
                        disabled={index === 0 || uploading || row.status === "done"}
                      >
                        Monter
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => moveRow(index, 1)}
                        disabled={index === rows.length - 1 || uploading || row.status === "done"}
                      >
                        Descendre
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeRow(row.id)}
                        disabled={uploading}
                      >
                        <X className="size-4" /> Retirer
                      </Button>
                    </div>
                    {row.status !== "ready" ? (
                      <Progress
                        value={row.progress}
                        aria-label={`Envoi partie ${index + 1} : ${row.progress} %`}
                      />
                    ) : null}
                    {row.error ? (
                      <p role="alert" className="text-xs text-destructive">
                        {row.error}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  className="min-h-12"
                  onClick={() => void send()}
                  disabled={!selected || !pending || uploading}
                >
                  <CloudUpload className="size-4" />{" "}
                  {rows.some((row) => row.status === "error")
                    ? "Réessayer les échecs"
                    : "Enregistrer en brouillon"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12"
                  onClick={reset}
                  disabled={uploading}
                >
                  <RotateCcw className="size-4" /> Nouvel envoi
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Les originaux restent privés. Les fichiers envoyés attendent une vérification avant
                publication. Un format non lisible sur cet appareil peut néanmoins être déposé pour
                traitement ultérieur.
              </p>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
