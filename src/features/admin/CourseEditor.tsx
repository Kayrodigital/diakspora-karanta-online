import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CircleDashed,
  FileAudio,
  FileText,
  HelpCircle,
  Layers3,
  Link2,
  LoaderCircle,
  Pencil,
  PlayCircle,
  Plus,
  Radio,
  Settings2,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { OrganizationBrand } from "@/lib/auth/portal-access";
import {
  addExternalResource,
  createBasicQuiz,
  createCourseLesson,
  createCourseModule,
  loadCourseEditor,
  setCourseCohorts,
  updateCoursePublication,
  updateCourseSettings,
  updateLessonPublication,
  uploadLessonResource,
  type CourseEditorData,
  type CourseLesson,
  type LessonResource,
} from "./course-editor-data";

type EditorDialog =
  | { kind: "module" }
  | { kind: "lesson"; moduleId: string }
  | { kind: "resource"; lessonId: string }
  | { kind: "quiz"; lessonId: string }
  | { kind: "settings" }
  | null;

type Props = {
  courseId: string;
  organization: OrganizationBrand;
  userId: string;
  backTo?: "/admin" | "/professeur";
  canPublish?: boolean;
};

const accessLabels: Record<string, string> = {
  organization: "Toute l'école",
  cohort: "Classes assignées",
  invite: "Sur invitation",
};

const resourceIcons = {
  audio: FileAudio,
  video: Video,
  youtube: PlayCircle,
  document: FileText,
  link: Link2,
  text: FileText,
  replay: Radio,
} as const;

function formValue(data: FormData, key: string): string {
  return String(data.get(key) ?? "").trim();
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function NativeSelect({
  id,
  name,
  defaultValue,
  children,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  children: ReactNode;
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {children}
    </select>
  );
}

function ModuleForm({
  onSubmit,
  pending,
}: {
  onSubmit: (data: FormData) => void;
  pending: boolean;
}) {
  return (
    <EditorForm
      title="Ajouter un module"
      description="Un module regroupe plusieurs leçons dans un ordre précis."
      pending={pending}
      onSubmit={onSubmit}
    >
      <Field label="Titre du module" htmlFor="title">
        <Input id="title" name="title" required autoFocus placeholder="Ex. Les fondements" />
      </Field>
      <Field label="Description (facultatif)" htmlFor="description">
        <Textarea id="description" name="description" rows={3} />
      </Field>
    </EditorForm>
  );
}

function LessonForm({
  onSubmit,
  pending,
}: {
  onSubmit: (data: FormData) => void;
  pending: boolean;
}) {
  return (
    <EditorForm
      title="Ajouter une leçon"
      description="Créez la leçon avant d'y associer ses audios, vidéos et quiz."
      pending={pending}
      onSubmit={onSubmit}
    >
      <Field label="Titre de la leçon" htmlFor="title">
        <Input
          id="title"
          name="title"
          required
          autoFocus
          placeholder="Ex. Cours n°1 — Introduction"
        />
      </Field>
      <Field label="Résumé (facultatif)" htmlFor="summary">
        <Textarea id="summary" name="summary" rows={3} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Format" htmlFor="lessonType">
          <NativeSelect id="lessonType" name="lessonType" defaultValue="on_demand">
            <option value="on_demand">À la demande</option>
            <option value="live">Cours en direct</option>
            <option value="hybrid">Hybride</option>
          </NativeSelect>
        </Field>
        <Field label="Durée estimée (minutes)" htmlFor="duration">
          <Input id="duration" name="duration" type="number" min="0" placeholder="45" />
        </Field>
      </div>
    </EditorForm>
  );
}

function ResourceForm({
  onSubmit,
  pending,
}: {
  onSubmit: (data: FormData) => void;
  pending: boolean;
}) {
  const [mode, setMode] = useState<"file" | "link" | "text">("file");
  return (
    <EditorForm
      title="Ajouter une ressource"
      description="Importez un audio WhatsApp, une vidéo, un PDF ou ajoutez un lien externe."
      pending={pending}
      onSubmit={onSubmit}
    >
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted p-1">
        {(
          [
            ["file", "Fichier"],
            ["link", "Lien"],
            ["text", "Texte"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`min-h-10 rounded-lg px-2 text-sm font-medium ${mode === value ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <input type="hidden" name="mode" value={mode} />
      <Field label="Titre" htmlFor="title">
        <Input
          id="title"
          name="title"
          required
          autoFocus
          placeholder={mode === "file" ? "Ex. Audio WhatsApp — cours 1" : "Ex. Vidéo du cours"}
        />
      </Field>
      {mode === "file" ? (
        <Field label="Fichier audio, vidéo ou PDF" htmlFor="file">
          <Input
            id="file"
            name="file"
            type="file"
            required
            accept="audio/mpeg,audio/mp4,audio/ogg,audio/webm,video/mp4,video/webm,application/pdf"
            className="min-h-12 py-2"
          />
        </Field>
      ) : null}
      {mode === "link" ? (
        <>
          <Field label="Type de lien" htmlFor="resourceType">
            <NativeSelect id="resourceType" name="resourceType" defaultValue="youtube">
              <option value="youtube">YouTube</option>
              <option value="video">Autre vidéo</option>
              <option value="replay">Replay</option>
              <option value="link">Lien utile</option>
            </NativeSelect>
          </Field>
          <Field label="Adresse du lien" htmlFor="externalUrl">
            <Input
              id="externalUrl"
              name="externalUrl"
              type="url"
              required
              placeholder="https://…"
            />
          </Field>
        </>
      ) : null}
      {mode === "text" ? (
        <Field label="Contenu ou transcription" htmlFor="transcript">
          <Textarea id="transcript" name="transcript" required rows={7} />
        </Field>
      ) : null}
      <Field label="Description (facultatif)" htmlFor="description">
        <Textarea id="description" name="description" rows={2} />
      </Field>
    </EditorForm>
  );
}

function QuizForm({ onSubmit, pending }: { onSubmit: (data: FormData) => void; pending: boolean }) {
  return (
    <EditorForm
      title="Créer un quiz"
      description="Commencez avec une question à choix unique. Vous pourrez enrichir le quiz ensuite."
      pending={pending}
      onSubmit={onSubmit}
    >
      <Field label="Titre du quiz" htmlFor="title">
        <Input id="title" name="title" required autoFocus placeholder="Quiz de compréhension" />
      </Field>
      <Field label="Question" htmlFor="prompt">
        <Textarea id="prompt" name="prompt" required rows={3} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Réponse A" htmlFor="option0">
          <Input id="option0" name="option0" required />
        </Field>
        <Field label="Réponse B" htmlFor="option1">
          <Input id="option1" name="option1" required />
        </Field>
        <Field label="Réponse C (facultatif)" htmlFor="option2">
          <Input id="option2" name="option2" />
        </Field>
        <Field label="Réponse D (facultatif)" htmlFor="option3">
          <Input id="option3" name="option3" />
        </Field>
      </div>
      <Field label="Bonne réponse" htmlFor="correctIndex">
        <NativeSelect id="correctIndex" name="correctIndex" defaultValue="0">
          <option value="0">Réponse A</option>
          <option value="1">Réponse B</option>
          <option value="2">Réponse C</option>
          <option value="3">Réponse D</option>
        </NativeSelect>
      </Field>
      <Field label="Explication après réponse (facultatif)" htmlFor="explanation">
        <Textarea id="explanation" name="explanation" rows={2} />
      </Field>
    </EditorForm>
  );
}

function SettingsForm({
  data,
  onSubmit,
  pending,
}: {
  data: CourseEditorData;
  onSubmit: (data: FormData) => void;
  pending: boolean;
}) {
  return (
    <EditorForm
      title="Paramètres du cours"
      description="Modifiez les informations générales et la règle d'accès."
      pending={pending}
      onSubmit={onSubmit}
    >
      <Field label="Titre" htmlFor="title">
        <Input id="title" name="title" required autoFocus defaultValue={data.course.title} />
      </Field>
      <Field label="Description" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={data.course.description ?? ""}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Niveau" htmlFor="level">
          <Input id="level" name="level" defaultValue={data.course.level ?? ""} />
        </Field>
        <Field label="Accès" htmlFor="accessScope">
          <NativeSelect id="accessScope" name="accessScope" defaultValue={data.course.access_scope}>
            <option value="cohort">Classes assignées</option>
            <option value="invite">Sur invitation</option>
            <option value="organization">Toute l'école</option>
          </NativeSelect>
        </Field>
      </div>
    </EditorForm>
  );
}

function EditorForm({
  title,
  description,
  pending,
  onSubmit,
  children,
}: {
  title: string;
  description: string;
  pending: boolean;
  onSubmit: (data: FormData) => void;
  children: ReactNode;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
  }
  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <DialogHeader>
        <DialogTitle className="font-serif text-2xl">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">{children}</div>
      <DialogFooter>
        <Button type="submit" disabled={pending} className="min-h-11">
          {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ResourceRow({ resource }: { resource: LessonResource }) {
  const Icon = resourceIcons[resource.resource_type as keyof typeof resourceIcons] ?? Link2;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary">
        <Icon size={18} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{resource.title}</p>
        <p className="text-xs capitalize text-muted-foreground">{resource.resource_type}</p>
      </div>
      {resource.external_url ? (
        <a
          href={resource.external_url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Ouvrir ${resource.title}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-background"
        >
          <Link2 size={17} aria-hidden />
        </a>
      ) : null}
    </div>
  );
}

function LessonCard({
  lesson,
  resources,
  quizCount,
  pending,
  onAddResource,
  onAddQuiz,
  onPublish,
  canPublish,
}: {
  lesson: CourseLesson;
  resources: LessonResource[];
  quizCount: number;
  pending: boolean;
  onAddResource: () => void;
  onAddQuiz: () => void;
  onPublish: (published: boolean) => void;
  canPublish: boolean;
}) {
  const published = lesson.status === "published";
  return (
    <div className="rounded-2xl border bg-background p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${published ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          {published ? (
            <CheckCircle2 size={18} aria-hidden />
          ) : (
            <CircleDashed size={18} aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="font-medium">{lesson.title}</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                {lesson.duration_minutes ? `${lesson.duration_minutes} min · ` : ""}
                {lesson.lesson_type === "live"
                  ? "Direct"
                  : lesson.lesson_type === "hybrid"
                    ? "Hybride"
                    : "À la demande"}
              </p>
            </div>
            {canPublish ? (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{published ? "Publiée" : "Brouillon"}</span>
                <Switch
                  checked={published}
                  disabled={pending}
                  onCheckedChange={onPublish}
                  aria-label={`Publier ${lesson.title}`}
                />
              </label>
            ) : (
              <Badge variant="secondary">À faire valider</Badge>
            )}
          </div>
          {lesson.summary ? (
            <p className="mt-3 text-sm text-muted-foreground">{lesson.summary}</p>
          ) : null}
          {resources.length || quizCount ? (
            <div className="mt-4 grid gap-2">
              {resources.map((resource) => (
                <ResourceRow key={resource.id} resource={resource} />
              ))}
              {quizCount ? (
                <div className="flex items-center gap-3 rounded-xl bg-[color:var(--gold)]/10 p-3">
                  <HelpCircle size={18} className="text-[color:var(--gold-dark)]" aria-hidden />
                  <span className="text-sm font-medium">
                    {quizCount} quiz associé{quizCount > 1 ? "s" : ""}
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">
              Aucun contenu associé.
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" className="min-h-10" onClick={onAddResource}>
              <Plus aria-hidden />
              Ressource
            </Button>
            <Button variant="outline" className="min-h-10" onClick={onAddQuiz}>
              <HelpCircle aria-hidden />
              Quiz
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CourseStructure({
  data,
  pending,
  onDialog,
  onPublishLesson,
  canPublish,
}: {
  data: CourseEditorData;
  pending: boolean;
  onDialog: (dialog: EditorDialog) => void;
  onPublishLesson: (lessonId: string, published: boolean) => void;
  canPublish: boolean;
}) {
  if (!data.modules.length)
    return (
      <div className="rounded-2xl border border-dashed bg-card px-5 py-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Layers3 aria-hidden />
        </div>
        <h2 className="mt-4 font-serif text-2xl font-semibold">Commencez par un module</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Chaque module rassemble une série ordonnée de leçons, comme un chapitre ou une partie du
          livre étudié.
        </p>
        <Button className="mt-5 min-h-11" onClick={() => onDialog({ kind: "module" })}>
          <Plus aria-hidden />
          Ajouter le premier module
        </Button>
      </div>
    );

  return (
    <Accordion
      type="multiple"
      defaultValue={data.modules.map((module) => module.id)}
      className="space-y-3"
    >
      {data.modules.map((module, moduleIndex) => {
        const lessons = data.lessons.filter((lesson) => lesson.module_id === module.id);
        return (
          <AccordionItem
            key={module.id}
            value={module.id}
            className="rounded-2xl border bg-card px-4 shadow-sm"
          >
            <AccordionTrigger className="min-h-16 hover:no-underline">
              <div className="flex min-w-0 items-center gap-3 text-left">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-semibold text-primary">
                  {moduleIndex + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-serif text-xl font-semibold">{module.title}</h3>
                  <p className="text-xs font-normal text-muted-foreground">
                    {lessons.length} leçon{lessons.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="grid gap-3">
                {lessons.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    resources={data.resources.filter(
                      (resource) => resource.lesson_id === lesson.id,
                    )}
                    quizCount={data.quizzes.filter((quiz) => quiz.lesson_id === lesson.id).length}
                    pending={pending}
                    canPublish={canPublish}
                    onAddResource={() => onDialog({ kind: "resource", lessonId: lesson.id })}
                    onAddQuiz={() => onDialog({ kind: "quiz", lessonId: lesson.id })}
                    onPublish={(published) => onPublishLesson(lesson.id, published)}
                  />
                ))}
                <Button
                  variant="outline"
                  className="min-h-11 border-dashed"
                  onClick={() => onDialog({ kind: "lesson", moduleId: module.id })}
                >
                  <Plus aria-hidden />
                  Ajouter une leçon
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

export function CourseEditor({
  courseId,
  organization,
  userId,
  backTo = "/admin",
  canPublish = true,
}: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["course-editor", organization.id, courseId] as const;
  const [dialog, setDialog] = useState<EditorDialog>(null);
  const editor = useQuery({ queryKey, queryFn: () => loadCourseEditor(organization.id, courseId) });
  const mutation = useMutation({
    mutationFn: async (action: () => Promise<void>) => action(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      setDialog(null);
      toast.success("Modification enregistrée.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "L'enregistrement a échoué."),
  });

  if (editor.isPending)
    return (
      <main className="min-h-screen bg-[color:var(--cream)]">
        <div className="mx-auto max-w-6xl space-y-5 px-4 py-8">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </main>
    );
  if (editor.isError)
    return (
      <main className="grid min-h-screen place-items-center bg-[color:var(--cream)] px-4">
        <Card className="max-w-lg">
          <CardContent className="p-7 text-center">
            <h1 className="font-serif text-2xl font-semibold">Cours indisponible</h1>
            <p className="mt-2 text-sm text-muted-foreground">{editor.error.message}</p>
            <Button asChild className="mt-5">
              <Link to={backTo}>
                {backTo === "/professeur" ? "Retour à mon espace" : "Retour à l'administration"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );

  const data = editor.data;
  const lessonCount = data.lessons.length;
  const publishedLessonCount = data.lessons.filter(
    (lesson) => lesson.status === "published",
  ).length;

  function submitDialog(formData: FormData) {
    if (!dialog) return;
    if (dialog.kind === "module")
      mutation.mutate(() =>
        createCourseModule({
          organizationId: organization.id,
          courseId,
          title: formValue(formData, "title"),
          description: formValue(formData, "description"),
          orderIndex: data.modules.length,
        }),
      );
    if (dialog.kind === "lesson") {
      const moduleLessons = data.lessons.filter((lesson) => lesson.module_id === dialog.moduleId);
      mutation.mutate(() =>
        createCourseLesson({
          organizationId: organization.id,
          courseId,
          moduleId: dialog.moduleId,
          userId,
          title: formValue(formData, "title"),
          summary: formValue(formData, "summary"),
          durationMinutes: Number(formValue(formData, "duration")) || undefined,
          lessonType: formValue(formData, "lessonType") as "on_demand" | "live" | "hybrid",
          orderIndex: moduleLessons.length,
        }),
      );
    }
    if (dialog.kind === "resource") {
      const lessonResources = data.resources.filter(
        (resource) => resource.lesson_id === dialog.lessonId,
      );
      const mode = formValue(formData, "mode");
      if (mode === "file") {
        const file = formData.get("file");
        if (!(file instanceof File) || !file.size) {
          toast.error("Sélectionnez un fichier.");
          return;
        }
        mutation.mutate(() =>
          uploadLessonResource({
            organizationId: organization.id,
            courseId,
            lessonId: dialog.lessonId,
            userId,
            title: formValue(formData, "title"),
            description: formValue(formData, "description"),
            file,
            orderIndex: lessonResources.length,
          }),
        );
      } else
        mutation.mutate(() =>
          addExternalResource({
            organizationId: organization.id,
            lessonId: dialog.lessonId,
            userId,
            title: formValue(formData, "title"),
            description: formValue(formData, "description"),
            resourceType:
              mode === "text"
                ? "text"
                : (formValue(formData, "resourceType") as "youtube" | "video" | "replay" | "link"),
            externalUrl: formValue(formData, "externalUrl"),
            transcript: formValue(formData, "transcript"),
            orderIndex: lessonResources.length,
          }),
        );
    }
    if (dialog.kind === "quiz") {
      const options = [0, 1, 2, 3]
        .map((index) => formValue(formData, `option${index}`))
        .filter(Boolean);
      const correctIndex = Number(formValue(formData, "correctIndex"));
      if (!options[correctIndex]) {
        toast.error("La bonne réponse sélectionnée doit être renseignée.");
        return;
      }
      mutation.mutate(() =>
        createBasicQuiz({
          organizationId: organization.id,
          lessonId: dialog.lessonId,
          userId,
          title: formValue(formData, "title"),
          prompt: formValue(formData, "prompt"),
          explanation: formValue(formData, "explanation"),
          options,
          correctIndex,
        }),
      );
    }
    if (dialog.kind === "settings")
      mutation.mutate(() =>
        updateCourseSettings({
          organizationId: organization.id,
          courseId,
          title: formValue(formData, "title"),
          description: formValue(formData, "description"),
          level: formValue(formData, "level"),
          accessScope: formValue(formData, "accessScope") as "organization" | "cohort" | "invite",
        }),
      );
  }

  return (
    <main className="min-h-screen bg-[color:var(--cream)] text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <Link
          to={backTo}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden />
          {backTo === "/professeur" ? "Mon espace professeur" : "Centre pédagogique"}
        </Link>
        <header className="mt-4 rounded-3xl border bg-card p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={data.course.status === "published" ? "default" : "secondary"}>
                  {data.course.status === "published" ? "Publié" : "Brouillon"}
                </Badge>
                <Badge variant="outline">
                  {accessLabels[data.course.access_scope] ?? data.course.access_scope}
                </Badge>
              </div>
              <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight sm:text-5xl">
                {data.course.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                {data.course.description || "Ajoutez une description pour présenter ce cours."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 lg:w-72">
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => setDialog({ kind: "settings" })}
              >
                <Settings2 aria-hidden />
                Modifier
              </Button>
              {canPublish ? (
                <Button
                  disabled={mutation.isPending || !publishedLessonCount}
                  className="min-h-11"
                  onClick={() =>
                    mutation.mutate(() =>
                      updateCoursePublication({
                        organizationId: organization.id,
                        courseId,
                        published: data.course.status !== "published",
                      }),
                    )
                  }
                >
                  {data.course.status === "published" ? "Dépublier" : "Publier"}
                </Button>
              ) : (
                <Badge className="min-h-11 justify-center px-4" variant="secondary">
                  Validation administrative requise
                </Badge>
              )}
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 border-t pt-5 text-center sm:max-w-lg sm:text-left">
            <div>
              <p className="text-2xl font-semibold">{data.modules.length}</p>
              <p className="text-xs text-muted-foreground">Modules</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{lessonCount}</p>
              <p className="text-xs text-muted-foreground">Leçons</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{publishedLessonCount}</p>
              <p className="text-xs text-muted-foreground">Publiées</p>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--gold-dark)]">
                  Programme
                </p>
                <h2 className="font-serif text-2xl font-semibold">Structure du cours</h2>
              </div>
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => setDialog({ kind: "module" })}
              >
                <Plus aria-hidden />
                Module
              </Button>
            </div>
            <CourseStructure
              data={data}
              pending={mutation.isPending}
              canPublish={canPublish}
              onDialog={setDialog}
              onPublishLesson={(lessonId, published) =>
                mutation.mutate(() =>
                  updateLessonPublication({ organizationId: organization.id, lessonId, published }),
                )
              }
            />
          </section>
          <aside className="space-y-4">
            <Card className="shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2">
                  <Users className="text-primary" aria-hidden />
                  <h2 className="font-serif text-xl font-semibold">Classes autorisées</h2>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Utilisé lorsque l'accès est limité aux classes assignées.
                </p>
                {data.cohorts.length ? (
                  <div className="mt-4 grid gap-2">
                    {data.cohorts.map((cohort) => {
                      const checked = data.assignedCohortIds.includes(cohort.id);
                      return (
                        <label
                          key={cohort.id}
                          className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3"
                        >
                          <Checkbox
                            checked={checked}
                            disabled={mutation.isPending}
                            onCheckedChange={(next) => {
                              const nextIds = next
                                ? [...data.assignedCohortIds, cohort.id]
                                : data.assignedCohortIds.filter((id) => id !== cohort.id);
                              mutation.mutate(() =>
                                setCourseCohorts({
                                  organizationId: organization.id,
                                  courseId,
                                  userId,
                                  previousIds: data.assignedCohortIds,
                                  nextIds,
                                }),
                              );
                            }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {cohort.name}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {cohort.level || cohort.code || "Classe active"}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Créez d'abord une classe depuis le centre pédagogique.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="border-[color:var(--gold)]/35 bg-[color:var(--gold)]/8 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2">
                  <BookOpen className="text-[color:var(--gold-dark)]" aria-hidden />
                  <h2 className="font-serif text-xl font-semibold">Prêt à publier ?</h2>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Publiez d'abord chaque leçon terminée. Le cours devient publiable dès qu'une leçon
                  l'est.
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${lessonCount ? Math.round((publishedLessonCount / lessonCount) * 100) : 0}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs font-medium">
                  {publishedLessonCount} sur {lessonCount} leçon{lessonCount > 1 ? "s" : ""} publiée
                  {publishedLessonCount > 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl sm:max-w-xl">
          {dialog?.kind === "module" ? (
            <ModuleForm onSubmit={submitDialog} pending={mutation.isPending} />
          ) : null}
          {dialog?.kind === "lesson" ? (
            <LessonForm onSubmit={submitDialog} pending={mutation.isPending} />
          ) : null}
          {dialog?.kind === "resource" ? (
            <ResourceForm onSubmit={submitDialog} pending={mutation.isPending} />
          ) : null}
          {dialog?.kind === "quiz" ? (
            <QuizForm onSubmit={submitDialog} pending={mutation.isPending} />
          ) : null}
          {dialog?.kind === "settings" ? (
            <SettingsForm data={data} onSubmit={submitDialog} pending={mutation.isPending} />
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
