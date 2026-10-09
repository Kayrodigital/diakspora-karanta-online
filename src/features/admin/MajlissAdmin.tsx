import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, MapPin, Mic2, Plus, Radio, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { majlissQueryKey, useMajlissCatalog } from "@/features/majliss/MajlissUi";
import {
  createMajlissItem,
  deleteMajlissDraft,
  setMajlissItemOrder,
  setMajlissItemStatus,
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
    })),
    ...catalog.teachers.map((item) => ({
      kind: "teacher" as const,
      id: item.id,
      title: item.display_name,
      status: item.status,
      order: item.order_index,
    })),
    ...catalog.recordings.map((item) => ({
      kind: "recording" as const,
      id: item.id,
      title: item.title,
      status: item.status,
      order: item.order_index,
    })),
  ];

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
              </>
            ) : null}
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
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contenus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((row) => (
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
                {row.status === "draft" ? (
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
          {!rows.length ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Aucun contenu Majliss.
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
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={`majliss-${name}`}>{label}</Label>
      {textarea ? (
        <Textarea id={`majliss-${name}`} name={name} required={required} />
      ) : (
        <Input id={`majliss-${name}`} name={name} type={type} required={required} />
      )}
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={`majliss-${name}`}>{label}</Label>
      <select
        id={`majliss-${name}`}
        name={name}
        required
        className="min-h-10 rounded-md border bg-background px-3 text-sm"
      >
        <option value="">Sélectionner</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
