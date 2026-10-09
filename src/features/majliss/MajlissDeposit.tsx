import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CloudUpload, Loader2, RotateCcw, WifiOff } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  loadAssistantAssignments,
  uploadAssistantRecording,
  type AssignmentOption,
} from "./assistant-ingestion";

type UploadRow = {
  file: File;
  progress: number;
  status: "ready" | "uploading" | "done" | "error";
  error?: string;
};

export function MajlissDeposit() {
  const query = useQuery({
    queryKey: ["majliss-assistant-assignments"],
    queryFn: loadAssistantAssignments,
  });
  const [assignmentId, setAssignmentId] = useState("");
  const [title, setTitle] = useState("");
  const [recordedOn, setRecordedOn] = useState("");
  const [rows, setRows] = useState<UploadRow[]>([]);
  const assignments = query.data?.assignments ?? [];
  const selected: AssignmentOption | undefined =
    assignments.find((item) => item.id === assignmentId) ??
    (assignments.length === 1 ? assignments[0] : undefined);

  const chooseFiles = (files: FileList | null) => {
    if (!files) return;
    setRows(Array.from(files).map((file) => ({ file, progress: 0, status: "ready" })));
  };
  const send = async () => {
    if (!selected) return;
    for (let index = 0; index < rows.length; index += 1) {
      setRows((current) =>
        current.map((row, i) =>
          i === index ? { ...row, status: "uploading", error: undefined } : row,
        ),
      );
      try {
        await uploadAssistantRecording({
          file: rows[index].file,
          title: rows.length === 1 ? title : undefined,
          recordedOn,
          assignment: selected,
          onProgress: (progress) =>
            setRows((current) =>
              current.map((row, i) => (i === index ? { ...row, progress } : row)),
            ),
        });
        setRows((current) =>
          current.map((row, i) => (i === index ? { ...row, progress: 100, status: "done" } : row)),
        );
      } catch (error) {
        setRows((current) =>
          current.map((row, i) =>
            i === index
              ? {
                  ...row,
                  status: "error",
                  error: error instanceof Error ? error.message : "Échec de l’envoi.",
                }
              : row,
          ),
        );
      }
    }
  };

  if (query.isPending)
    return (
      <main className="mx-auto max-w-xl p-4">
        <Loader2 className="size-6 animate-spin" />
      </main>
    );
  if (query.isError)
    return <main className="mx-auto max-w-xl p-4 text-destructive">{query.error.message}</main>;
  if (!query.data.enabled)
    return (
      <main className="mx-auto max-w-xl p-4">
        <Card>
          <CardContent className="p-6">
            Le dépôt Majliss n’est pas encore activé pour cette organisation.
          </CardContent>
        </Card>
      </main>
    );

  return (
    <main className="mx-auto min-h-dvh max-w-xl bg-background p-4 pb-12 sm:p-6">
      <header className="mb-5 space-y-2">
        <Badge variant="secondary">Majliss · dépôt assistant</Badge>
        <h1 className="text-2xl font-semibold tracking-tight">Envoyer un enregistrement</h1>
        <p className="text-sm text-muted-foreground">
          L’original est conservé en privé. Un administrateur l’écoute avant publication.
        </p>
      </header>
      {!assignments.length ? (
        <Card>
          <CardContent className="space-y-2 p-6">
            <WifiOff className="size-5 text-muted-foreground" />
            <p className="font-medium">Aucune affectation active</p>
            <p className="text-sm text-muted-foreground">
              Demandez à un administrateur de vous affecter à un professeur.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Destination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {assignments.length === 1 ? (
              <div className="rounded-xl border bg-muted/40 p-4">
                <p className="font-medium">{assignments[0].teacher.display_name}</p>
                <p className="text-sm text-muted-foreground">
                  {assignments[0].village.name}, {assignments[0].village.country}
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="assignment">Professeur</Label>
                <select
                  id="assignment"
                  value={assignmentId}
                  onChange={(event) => setAssignmentId(event.target.value)}
                  className="min-h-12 rounded-md border bg-background px-3"
                >
                  <option value="">Choisir</option>
                  {assignments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.teacher.display_name} — {item.village.name}, {item.village.country}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="audio">2. Audio (OPUS, OGG, M4A, MP3, AAC ou WAV)</Label>
              <Input
                id="audio"
                type="file"
                multiple
                accept=".opus,.ogg,.m4a,.mp3,.aac,.wav,audio/*"
                className="min-h-12 file:mr-3"
                onChange={(event) => chooseFiles(event.target.files)}
              />
            </div>
            {rows.length === 1 ? (
              <div className="grid gap-2">
                <Label htmlFor="title">Titre facultatif</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="L’admin pourra le corriger"
                />
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="recorded-on">Date facultative</Label>
              <Input
                id="recorded-on"
                type="date"
                value={recordedOn}
                onChange={(event) => setRecordedOn(event.target.value)}
              />
            </div>
            <div className="space-y-3">
              {rows.map((row, index) => (
                <div key={`${row.file.name}-${index}`} className="rounded-xl border p-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(row.file.size / 1024 / 1024).toFixed(1)} Mo
                      </p>
                    </div>
                    {row.status === "done" ? (
                      <CheckCircle2 className="size-5 text-emerald-600" />
                    ) : row.status === "uploading" ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : null}
                  </div>
                  {row.status !== "ready" ? (
                    <Progress value={row.progress} className="mt-3" />
                  ) : null}
                  {row.error ? <p className="mt-2 text-xs text-destructive">{row.error}</p> : null}
                </div>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                className="min-h-12"
                disabled={
                  !selected ||
                  !rows.length ||
                  rows.some((row) => row.status === "uploading") ||
                  rows.every((row) => row.status === "done")
                }
                onClick={() => void send()}
              >
                <CloudUpload className="size-4" />
                Envoyer
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-12"
                onClick={() => {
                  setRows([]);
                  setTitle("");
                  setRecordedOn("");
                }}
              >
                <RotateCcw className="size-4" />
                Nouvel envoi
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              En cas de coupure, relancez l’envoi du même fichier : le transfert reprend
              automatiquement lorsque possible.
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
