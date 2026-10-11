import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Check,
  GripVertical,
  MapPin,
  Mic2,
  Plus,
  Radio,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { majlissQueryKey, useMajlissCatalog } from "@/features/majliss/MajlissUi";
import { MajlissAudioUploader } from "@/features/majliss/MajlissAudioUploader";
import {
  createMajlissItem,
  deleteMajlissDraft,
  setMajlissItemOrder,
  setMajlissItemStatus,
  updateMajlissRecordingReview,
  type MajlissAdminKind,
} from "@/features/majliss/majliss-data";

type Props = { organizationId: string; userId: string };

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function MajlissAdmin({ organizationId, userId }: Props) {
  const query = useMajlissCatalog();
  const queryClient = useQueryClient();
  const [formKind, setFormKind] = useState<MajlissAdminKind>("village");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [recordingSearch, setRecordingSearch] = useState("");
  const [villageFilter, setVillageFilter] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: majlissQueryKey });
  const mutation = useMutation({
    mutationFn: async (action: () => Promise<void>) => action(),
    onSuccess: async () => {
      await refresh();
      toast.success("Majliss mis à jour.");
    },
    onError: (error) => toast.error(error.message),
  });

  if (query.isPending)
    return <p className="text-sm text-muted-foreground">Chargement du Majliss…</p>;
  if (query.isError)
    return (
      <p className="text-sm text-destructive">
        Impossible de charger le Majliss : {query.error.message}
      </p>
    );

  const catalog = query.data;
  const uploadOptions = catalog.teacherVillages.flatMap((link) => {
    const village = catalog.villages.find((item) => item.id === link.village_id);
    const teacher = catalog.teachers.find((item) => item.id === link.teacher_id);
    if (!village || !teacher) return [];
    return [
      {
        id: link.id,
        label: `${village.name}, ${village.country} — ${teacher.display_name}`,
        destination: {
          organizationId,
          villageId: village.id,
          teacherId: teacher.id,
        },
      },
    ];
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (formKind === "village") {
      const name = String(data.get("name") ?? "").trim();
      mutation.mutate(async () => {
        await createMajlissItem(organizationId, userId, {
          kind: "village",
          name,
          slug: slugify(String(data.get("slug") || name)),
          country: String(data.get("country") ?? "").trim(),
          description: String(data.get("description") ?? "").trim(),
        });
        form.reset();
      });
      return;
    }
    if (formKind === "teacher") {
      const displayName = String(data.get("displayName") ?? "").trim();
      mutation.mutate(async () => {
        await createMajlissItem(organizationId, userId, {
          kind: "teacher",
          displayName,
          slug: slugify(String(data.get("slug") || displayName)),
          biography: String(data.get("description") ?? "").trim(),
          villageId: String(data.get("villageId") ?? ""),
        });
        form.reset();
      });
      return;
    }
    const title = String(data.get("title") ?? "").trim();
    mutation.mutate(async () => {
      const duration = Number(data.get("durationSeconds"));
      await createMajlissItem(organizationId, userId, {
        kind: "recording",
        title,
        slug: slugify(String(data.get("slug") || title)),
        villageId: String(data.get("villageId") ?? ""),
        teacherId: String(data.get("teacherId") ?? ""),
        mediaType: String(data.get("mediaType") ?? "audio") as "audio" | "youtube" | "video",
        mediaUrl: String(data.get("mediaUrl") ?? "").trim(),
        durationSeconds: Number.isFinite(duration) && duration > 0 ? duration : undefined,
        language: String(data.get("language") ?? "").trim(),
      });
      form.reset();
    });
  };

  const rows = [
    ...catalog.villages.map((item) => ({
      kind: "village" as const,
      id: item.id,
      title: `${item.name}, ${item.country}`,
      status: item.status,
      order: item.order_index,
      deletable: true,
    })),
    ...catalog.teachers.map((item) => ({
      kind: "teacher" as const,
      id: item.id,
      title: item.display_name,
      status: item.status,
      order: item.order_index,
      deletable: true,
    })),
    ...catalog.recordings.map((item) => ({
      kind: "recording" as const,
      id: item.id,
      title: item.title,
      status: item.status,
      order: item.order_index,
      deletable: item.storage_bucket === null,
    })),
  ];
  const recordingsById = new Map(catalog.recordings.map((item) => [item.id, item]));
  const filteredRows = rows.filter((row) => {
    if (row.kind !== "recording")
      return !recordingSearch && !villageFilter && !teacherFilter && !dateFilter;
    const recording = recordingsById.get(row.id);
    if (!recording) return false;
    return (
      recording.title.toLocaleLowerCase("fr").includes(recordingSearch.toLocaleLowerCase("fr")) &&
      (!villageFilter || recording.village_id === villageFilter) &&
      (!teacherFilter || recording.teacher_id === teacherFilter) &&
      (!dateFilter || recording.recorded_on === dateFilter)
    );
  });
  const storageBytes = catalog.recordings.reduce(
    (total, item) => total + (item.file_size_bytes ?? 0),
    0,
  );
  const reviewQueue = catalog.recordings
    .filter(
      (item) =>
        (item.upload_source === "assistant_upload" || item.upload_source === "whatsapp_import") &&
        item.review_status === "pending",
    )
    .sort(
      (a, b) =>
        a.order_index - b.order_index || (a.received_at ?? "").localeCompare(b.received_at ?? ""),
    );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Majliss</h2>
        <p className="text-sm text-muted-foreground">
          Villages, professeurs et enregistrements réels. Les nouveaux éléments restent brouillons
          jusqu’à publication explicite.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <MapPin className="size-5 text-primary" />
            <div>
              <p className="text-2xl font-semibold">{catalog.villages.length}</p>
              <p className="text-xs text-muted-foreground">Villages</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Mic2 className="size-5 text-primary" />
            <div>
              <p className="text-2xl font-semibold">{catalog.teachers.length}</p>
              <p className="text-xs text-muted-foreground">Professeurs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Radio className="size-5 text-primary" />
            <div>
              <p className="text-2xl font-semibold">{catalog.recordings.length}</p>
              <p className="text-xs text-muted-foreground">Enregistrements</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ajouter un contenu réel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            {(["village", "teacher", "recording"] as const).map((kind) => (
              <Button
                key={kind}
                type="button"
                variant={formKind === kind ? "default" : "outline"}
                onClick={() => setFormKind(kind)}
              >
                {kind === "village"
                  ? "Village"
                  : kind === "teacher"
                    ? "Professeur"
                    : "Enregistrement"}
              </Button>
            ))}
          </div>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
            {formKind === "village" ? (
              <>
                <Field label="Nom" name="name" required />
                <Field label="Pays" name="country" required />
                <Field label="Slug (facultatif)" name="slug" />
                <Field label="Description" name="description" textarea />
              </>
            ) : null}
            {formKind === "teacher" ? (
              <>
                <Field label="Nom d’affichage" name="displayName" required />
                <Field label="Slug (facultatif)" name="slug" />
                <SelectField
                  label="Village"
                  name="villageId"
                  options={catalog.villages.map((item) => ({
                    value: item.id,
                    label: `${item.name}, ${item.country}`,
                  }))}
                />
                <Field label="Biographie" name="description" textarea />
              </>
            ) : null}
            {formKind === "recording" ? (
              <>
                <div className="sm:col-span-2">
                  <h3 className="mb-3 font-medium">Importer des fichiers audio</h3>
                  <MajlissAudioUploader options={uploadOptions} onComplete={refresh} />
                </div>
                <details className="sm:col-span-2 rounded-xl border p-4">
                  <summary className="cursor-pointer font-medium">
                    Option avancée : ajouter une URL externe
                  </summary>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Titre" name="title" required />
                    <Field label="URL HTTPS réelle" name="mediaUrl" type="url" required />
                    <SelectField
                      label="Village"
                      name="villageId"
                      options={catalog.villages.map((item) => ({
                        value: item.id,
                        label: `${item.name}, ${item.country}`,
                      }))}
                    />
                    <SelectField
                      label="Professeur"
                      name="teacherId"
                      options={catalog.teachers.map((item) => ({
                        value: item.id,
                        label: item.display_name,
                      }))}
                    />
                    <SelectField
                      label="Type"
                      name="mediaType"
                      options={[
                        { value: "audio", label: "Audio" },
                        { value: "youtube", label: "YouTube" },
                        { value: "video", label: "Vidéo" },
                      ]}
                    />
                    <Field
                      label="Durée en secondes (facultatif)"
                      name="durationSeconds"
                      type="number"
                    />
                    <Field label="Langue (facultatif)" name="language" />
                    <Field label="Slug (facultatif)" name="slug" />
                    <div className="sm:col-span-2">
                      <Button disabled={mutation.isPending}>
                        <Plus className="size-4" />
                        Créer en brouillon depuis l’URL
                      </Button>
                    </div>
                  </div>
                </details>
              </>
            ) : null}
            {formKind !== "recording" ? (
              <div className="sm:col-span-2">
                <Button
                  disabled={
                    mutation.isPending || (formKind !== "village" && !catalog.villages.length)
                  }
                >
                  <Plus className="size-4" />
                  Créer en brouillon
                </Button>
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">À vérifier ({reviewQueue.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reviewQueue.map((recording) => (
            <form
              key={recording.id}
              draggable
              onDragStart={() => setDraggingId(recording.id)}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const source = reviewQueue.find((item) => item.id === draggingId);
                if (!source || source.id === recording.id) return;
                mutation.mutate(() =>
                  Promise.all([
                    setMajlissItemOrder("recording", source.id, recording.order_index),
                    setMajlissItemOrder("recording", recording.id, source.order_index),
                  ]).then(() => undefined),
                );
              }}
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                mutation.mutate(() =>
                  updateMajlissRecordingReview(recording.id, {
                    title: String(data.get("title") ?? ""),
                    description: String(data.get("description") ?? ""),
                    recordedOn: String(data.get("recordedOn") ?? ""),
                    villageId: String(data.get("villageId") ?? ""),
                    teacherId: String(data.get("teacherId") ?? ""),
                    orderIndex: Number(data.get("orderIndex") ?? 0),
                  }),
                );
              }}
              className="space-y-4 rounded-xl border p-4"
            >
              <div className="flex items-start gap-3">
                <GripVertical
                  className="mt-1 size-5 cursor-grab text-muted-foreground"
                  aria-label="Déplacer"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{recording.original_file_name}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>Déposé par : {recording.uploaded_by}</span>
                    <span>·</span>
                    <span>
                      Reçu{" "}
                      {recording.received_at
                        ? new Date(recording.received_at).toLocaleString("fr-FR")
                        : "—"}
                    </span>
                    <span>·</span>
                    <span>{recording.mime_type}</span>
                    <span>·</span>
                    <span>
                      {recording.file_size_bytes
                        ? `${(recording.file_size_bytes / 1024 / 1024).toFixed(1)} Mo`
                        : "Taille inconnue"}
                    </span>
                    {recording.duration_seconds ? (
                      <span>· {recording.duration_seconds} s</span>
                    ) : null}
                    {recording.duplicate_of ? (
                      <Badge variant="destructive">Doublon possible</Badge>
                    ) : null}
                    {recording.processing_status === "needs_normalization" ? (
                      <Badge variant="outline">Normalisation recommandée</Badge>
                    ) : null}
                  </div>
                </div>
              </div>
              <audio className="w-full" controls preload="metadata" src={recording.media_url}>
                Votre navigateur ne peut pas lire cet audio.
              </audio>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Titre" name="title" required defaultValue={recording.title} />
                <Field
                  label="Date"
                  name="recordedOn"
                  type="date"
                  defaultValue={recording.recorded_on ?? ""}
                />
                <SelectField
                  label="Village"
                  name="villageId"
                  defaultValue={recording.village_id}
                  options={catalog.villages.map((item) => ({
                    value: item.id,
                    label: `${item.name}, ${item.country}`,
                  }))}
                />
                <SelectField
                  label="Professeur"
                  name="teacherId"
                  defaultValue={recording.teacher_id}
                  options={catalog.teachers.map((item) => ({
                    value: item.id,
                    label: item.display_name,
                  }))}
                />
                <Field
                  label="Ordre"
                  name="orderIndex"
                  type="number"
                  defaultValue={String(recording.order_index)}
                />
                <Field
                  label="Description"
                  name="description"
                  textarea
                  defaultValue={recording.description ?? ""}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="sm" variant="outline">
                  <Save className="size-4" />
                  Enregistrer
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    mutation.mutate(() =>
                      setMajlissItemStatus("recording", recording.id, "published"),
                    )
                  }
                >
                  <Check className="size-4" />
                  Publier
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    mutation.mutate(() =>
                      setMajlissItemStatus("recording", recording.id, "archived"),
                    )
                  }
                >
                  <X className="size-4" />
                  Rejeter / archiver
                </Button>
              </div>
            </form>
          ))}
          {!reviewQueue.length ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Aucun enregistrement en attente.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contenus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 rounded-xl bg-muted/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="majliss-search">Rechercher un enregistrement</Label>
              <Input
                id="majliss-search"
                value={recordingSearch}
                onChange={(event) => setRecordingSearch(event.target.value)}
                placeholder="Titre"
              />
            </div>
            <SelectField
              label="Village"
              name="archiveVillage"
              defaultValue={villageFilter}
              options={catalog.villages.map((item) => ({ value: item.id, label: item.name }))}
              onChange={setVillageFilter}
              optional
            />
            <SelectField
              label="Professeur"
              name="archiveTeacher"
              defaultValue={teacherFilter}
              options={catalog.teachers.map((item) => ({
                value: item.id,
                label: item.display_name,
              }))}
              onChange={setTeacherFilter}
              optional
            />
            <div className="grid gap-2">
              <Label htmlFor="majliss-archive-date">Date du cours</Label>
              <Input
                id="majliss-archive-date"
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Audio archivé : {(storageBytes / 1024 / 1024).toFixed(1)} Mo référencés dans Supabase.
            L’archivage conserve les fichiers.
          </p>
          {filteredRows.map((row) => (
            <div
              key={`${row.kind}-${row.id}`}
              className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{row.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="secondary">{row.kind}</Badge>
                  <Badge variant={row.status === "published" ? "default" : "outline"}>
                    {row.status}
                  </Badge>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Ordre
                <Input
                  className="h-9 w-20"
                  type="number"
                  min="0"
                  defaultValue={row.order}
                  onBlur={(event) =>
                    mutation.mutate(() =>
                      setMajlissItemOrder(row.kind, row.id, Number(event.currentTarget.value)),
                    )
                  }
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {row.status !== "published" ? (
                  <Button
                    size="sm"
                    onClick={() =>
                      mutation.mutate(() => setMajlissItemStatus(row.kind, row.id, "published"))
                    }
                  >
                    Publier
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      mutation.mutate(() => setMajlissItemStatus(row.kind, row.id, "archived"))
                    }
                  >
                    <Archive className="size-4" />
                    Archiver
                  </Button>
                )}
                {row.status === "draft" && row.deletable ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => mutation.mutate(() => deleteMajlissDraft(row.kind, row.id))}
                  >
                    <Trash2 className="size-4" />
                    Supprimer
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {!filteredRows.length ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Aucun contenu Majliss correspondant.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  textarea,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
  defaultValue?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={`majliss-${name}`}>{label}</Label>
      {textarea ? (
        <Textarea
          id={`majliss-${name}`}
          name={name}
          required={required}
          defaultValue={defaultValue}
        />
      ) : (
        <Input
          id={`majliss-${name}`}
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue}
        />
      )}
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
  onChange,
  optional,
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
  onChange?: (value: string) => void;
  optional?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={`majliss-${name}`}>{label}</Label>
      <select
        id={`majliss-${name}`}
        name={name}
        required={!optional}
        defaultValue={defaultValue ?? ""}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className="min-h-10 rounded-md border bg-background px-3 text-sm"
      >
        <option value="">{optional ? "Tous" : "Sélectionner"}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
