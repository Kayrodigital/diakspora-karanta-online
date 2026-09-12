import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BookMarked,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Headphones,
  Layers3,
  LoaderCircle,
  Plus,
  Radio,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { OrganizationBrand } from "@/lib/auth/portal-access";
import {
  createLearningItem,
  loadPedagogicalDashboard,
  type LearningItemInput,
  type PedagogicalDashboard,
} from "./pedagogical-data";

type CreationKind = LearningItemInput["kind"];

type Props = {
  organization: OrganizationBrand;
  userId: string;
};

const creationLabels: Record<CreationKind, { title: string; description: string }> = {
  course: {
    title: "Créer un cours",
    description: "Le cours sera créé en brouillon avant l'ajout de ses modules et leçons.",
  },
  cohort: {
    title: "Créer une classe",
    description: "Regroupez les élèves pour réserver les cours et les directs à leur classe.",
  },
  book: {
    title: "Ajouter un livre",
    description: "Référencez le support autour duquel les leçons seront organisées.",
  },
  subject: {
    title: "Ajouter une matière",
    description: "Les matières permettent de structurer votre catalogue pédagogique.",
  },
  live: {
    title: "Planifier un direct",
    description: "Préparez le rendez-vous et son lien Zoom, Meet, Telegram ou WhatsApp.",
  },
};

const providerLabels: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  other: "Autre",
};

const accessLabels: Record<string, string> = {
  organization: "Toute l'école",
  cohort: "Classes assignées",
  invite: "Sur invitation",
};

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optionalValue(formData: FormData, key: string): string | undefined {
  return value(formData, key) || undefined;
}

function inputFromForm(kind: CreationKind, formData: FormData): LearningItemInput {
  if (kind === "course") {
    return {
      kind,
      title: value(formData, "title"),
      description: optionalValue(formData, "description"),
      level: optionalValue(formData, "level"),
      language: value(formData, "language") || "fr",
      accessScope: (value(formData, "accessScope") || "cohort") as
        "organization" | "cohort" | "invite",
      subjectId: optionalValue(formData, "subjectId"),
      bookId: optionalValue(formData, "bookId"),
    };
  }

  if (kind === "cohort") {
    const capacity = Number(value(formData, "maxStudents"));
    return {
      kind,
      name: value(formData, "name"),
      code: optionalValue(formData, "code"),
      description: optionalValue(formData, "description"),
      level: optionalValue(formData, "level"),
      maxStudents: Number.isFinite(capacity) && capacity > 0 ? capacity : undefined,
    };
  }

  if (kind === "book") {
    return {
      kind,
      title: value(formData, "title"),
      author: optionalValue(formData, "author"),
      description: optionalValue(formData, "description"),
      level: optionalValue(formData, "level"),
      subjectId: optionalValue(formData, "subjectId"),
    };
  }

  if (kind === "subject") {
    return {
      kind,
      name: value(formData, "name"),
      description: optionalValue(formData, "description"),
    };
  }

  return {
    kind,
    title: value(formData, "title"),
    description: optionalValue(formData, "description"),
    provider: (value(formData, "provider") || "zoom") as
      "zoom" | "google_meet" | "telegram" | "whatsapp" | "other",
    startsAt: value(formData, "startsAt"),
    joinUrl: optionalValue(formData, "joinUrl"),
    courseId: optionalValue(formData, "courseId"),
    cohortId: optionalValue(formData, "cohortId"),
  };
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
      className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {children}
    </select>
  );
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

function CommonDescriptionField() {
  return (
    <Field label="Description (facultatif)" htmlFor="description">
      <Textarea id="description" name="description" rows={3} />
    </Field>
  );
}

function CourseFields({ data }: { data: PedagogicalDashboard }) {
  return (
    <>
      <Field label="Titre du cours" htmlFor="title">
        <Input
          id="title"
          name="title"
          required
          autoFocus
          placeholder="Ex. Étude du livre de la prière"
        />
      </Field>
      <CommonDescriptionField />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Matière" htmlFor="subjectId">
          <NativeSelect id="subjectId" name="subjectId" defaultValue="">
            <option value="">Sans matière</option>
            {data.subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Livre étudié" htmlFor="bookId">
          <NativeSelect id="bookId" name="bookId" defaultValue="">
            <option value="">Sans livre</option>
            {data.books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Niveau" htmlFor="level">
          <Input id="level" name="level" placeholder="Ex. Débutant" />
        </Field>
        <Field label="Langue" htmlFor="language">
          <NativeSelect id="language" name="language" defaultValue="fr">
            <option value="fr">Français</option>
            <option value="dyo">Diakhanké</option>
            <option value="ar">Arabe</option>
          </NativeSelect>
        </Field>
      </div>
      <Field label="Accès au cours" htmlFor="accessScope">
        <NativeSelect id="accessScope" name="accessScope" defaultValue="cohort">
          <option value="cohort">Classes assignées</option>
          <option value="invite">Sur invitation</option>
          <option value="organization">Toute l'école</option>
        </NativeSelect>
      </Field>
    </>
  );
}

function CohortFields() {
  return (
    <>
      <Field label="Nom de la classe" htmlFor="name">
        <Input
          id="name"
          name="name"
          required
          autoFocus
          placeholder="Ex. Groupe adultes — niveau 1"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" htmlFor="code">
          <Input id="code" name="code" placeholder="ADU-N1" />
        </Field>
        <Field label="Capacité" htmlFor="maxStudents">
          <Input id="maxStudents" name="maxStudents" type="number" min="1" placeholder="25" />
        </Field>
      </div>
      <Field label="Niveau" htmlFor="level">
        <Input id="level" name="level" placeholder="Ex. Intermédiaire" />
      </Field>
      <CommonDescriptionField />
    </>
  );
}

function BookFields({ data }: { data: PedagogicalDashboard }) {
  return (
    <>
      <Field label="Titre du livre" htmlFor="title">
        <Input id="title" name="title" required autoFocus />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Auteur" htmlFor="author">
          <Input id="author" name="author" />
        </Field>
        <Field label="Niveau" htmlFor="level">
          <Input id="level" name="level" />
        </Field>
      </div>
      <Field label="Matière" htmlFor="subjectId">
        <NativeSelect id="subjectId" name="subjectId" defaultValue="">
          <option value="">Sans matière</option>
          {data.subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <CommonDescriptionField />
    </>
  );
}

function SubjectFields() {
  return (
    <>
      <Field label="Nom de la matière" htmlFor="name">
        <Input id="name" name="name" required autoFocus placeholder="Ex. Fiqh" />
      </Field>
      <CommonDescriptionField />
    </>
  );
}

function LiveFields({ data }: { data: PedagogicalDashboard }) {
  return (
    <>
      <Field label="Titre du direct" htmlFor="title">
        <Input
          id="title"
          name="title"
          required
          autoFocus
          placeholder="Ex. Cours hebdomadaire de fiqh"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Outil" htmlFor="provider">
          <NativeSelect id="provider" name="provider" defaultValue="zoom">
            <option value="zoom">Zoom</option>
            <option value="google_meet">Google Meet</option>
            <option value="telegram">Telegram</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="other">Autre</option>
          </NativeSelect>
        </Field>
        <Field label="Date et heure" htmlFor="startsAt">
          <Input id="startsAt" name="startsAt" type="datetime-local" required />
        </Field>
      </div>
      <Field label="Lien de participation" htmlFor="joinUrl">
        <Input id="joinUrl" name="joinUrl" type="url" placeholder="https://…" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cours lié" htmlFor="courseId">
          <NativeSelect id="courseId" name="courseId" defaultValue="">
            <option value="">Aucun cours</option>
            {data.courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Classe concernée" htmlFor="cohortId">
          <NativeSelect id="cohortId" name="cohortId" defaultValue="">
            <option value="">Toutes les classes autorisées</option>
            {data.cohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <CommonDescriptionField />
    </>
  );
}

function CreateItemDialog({
  kind,
  onKindChange,
  data,
  isPending,
  onSubmit,
}: {
  kind: CreationKind | null;
  onKindChange: (kind: CreationKind | null) => void;
  data: PedagogicalDashboard;
  isPending: boolean;
  onSubmit: (input: LearningItemInput) => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!kind) return;
    onSubmit(inputFromForm(kind, new FormData(event.currentTarget)));
  }

  return (
    <Dialog open={kind !== null} onOpenChange={(open) => !open && onKindChange(null)}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl sm:max-w-xl">
        {kind ? (
          <form onSubmit={handleSubmit} className="grid gap-5">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">
                {creationLabels[kind].title}
              </DialogTitle>
              <DialogDescription>{creationLabels[kind].description}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              {kind === "course" && <CourseFields data={data} />}
              {kind === "cohort" && <CohortFields />}
              {kind === "book" && <BookFields data={data} />}
              {kind === "subject" && <SubjectFields />}
              {kind === "live" && <LiveFields data={data} />}
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => onKindChange(null)}
              >
                Annuler
              </Button>
              <Button type="submit" className="min-h-11" disabled={isPending}>
                {isPending ? (
                  <LoaderCircle className="animate-spin" aria-hidden />
                ) : (
                  <Plus aria-hidden />
                )}
                {isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  onCreate,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-5 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon aria-hidden />
      </div>
      <h3 className="mt-4 font-serif text-xl font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      <Button className="mt-5 min-h-11" onClick={onCreate}>
        <Plus aria-hidden />
        Créer le premier
      </Button>
    </div>
  );
}

function formatLiveDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "Brouillon",
    published: "Publié",
    archived: "Archivé",
    active: "Active",
    scheduled: "Planifié",
    live: "En direct",
    completed: "Terminé",
    cancelled: "Annulé",
  };
  return labels[status] ?? status;
}

function DashboardContent({
  data,
  onCreate,
}: {
  data: PedagogicalDashboard;
  onCreate: (kind: CreationKind) => void;
}) {
  const upcomingLives = useMemo(
    () =>
      data.liveSessions.filter((session) => new Date(session.starts_at).getTime() >= Date.now()),
    [data.liveSessions],
  );

  const stats = [
    { label: "Cours", value: data.courses.length, icon: GraduationCap },
    { label: "Classes", value: data.cohorts.length, icon: Users },
    { label: "Livres", value: data.books.length, icon: BookMarked },
    { label: "Directs à venir", value: upcomingLives.length, icon: Radio },
  ];

  return (
    <>
      <section aria-label="Vue d'ensemble" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border/70 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4 sm:p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon aria-hidden />
              </div>
              <div>
                <p className="text-2xl font-semibold leading-none">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-5 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2">
          <Layers3 className="text-[color:var(--gold)]" aria-hidden />
          <h2 className="font-serif text-xl font-semibold">Création rapide</h2>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(
            [
              ["course", "Cours", BookOpen],
              ["cohort", "Classe", Users],
              ["live", "Direct", Radio],
              ["book", "Livre", BookMarked],
              ["subject", "Matière", Layers3],
            ] as const
          ).map(([kind, label, Icon]) => (
            <Button
              key={kind}
              variant="outline"
              className="min-h-12 justify-start rounded-xl"
              onClick={() => onCreate(kind)}
            >
              <Icon aria-hidden />
              {label}
            </Button>
          ))}
        </div>
      </section>

      <Tabs defaultValue="courses" className="mt-6">
        <TabsList className="grid h-auto w-full grid-cols-4 rounded-xl p-1">
          <TabsTrigger value="courses" className="min-h-10 px-2">
            Cours
          </TabsTrigger>
          <TabsTrigger value="cohorts" className="min-h-10 px-2">
            Classes
          </TabsTrigger>
          <TabsTrigger value="lives" className="min-h-10 px-2">
            Directs
          </TabsTrigger>
          <TabsTrigger value="books" className="min-h-10 px-2">
            Livres
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="mt-4">
          {data.courses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Aucun cours"
              description="Créez un cours, puis vous pourrez lui ajouter des modules, audios, vidéos et quiz."
              onCreate={() => onCreate("course")}
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {data.courses.map((course) => (
                <Card key={course.id} className="group shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {course.level || "Tous niveaux"}
                        </p>
                        <h3 className="mt-1 font-serif text-xl font-semibold">{course.title}</h3>
                      </div>
                      <Badge variant={course.status === "published" ? "default" : "secondary"}>
                        {statusLabel(course.status)}
                      </Badge>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                      {course.description || "Aucune description pour le moment."}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t pt-4 text-xs">
                      <span className="rounded-full bg-muted px-2.5 py-1">
                        {accessLabels[course.access_scope] ?? course.access_scope}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-primary">
                        Structurer le cours <ArrowUpRight size={14} aria-hidden />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cohorts" className="mt-4">
          {data.cohorts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Aucune classe"
              description="Créez une classe pour organiser les élèves et verrouiller leurs cours et directs."
              onCreate={() => onCreate("cohort")}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.cohorts.map((cohort) => (
                <Card key={cohort.id} className="shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-2">
                      <Users className="text-primary" aria-hidden />
                      <Badge variant="outline">{statusLabel(cohort.status)}</Badge>
                    </div>
                    <h3 className="mt-4 font-serif text-xl font-semibold">{cohort.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {cohort.level || "Niveau non défini"}
                    </p>
                    <div className="mt-4 flex justify-between border-t pt-3 text-xs text-muted-foreground">
                      <span>{cohort.code || "Sans code"}</span>
                      <span>
                        {cohort.max_students ? `${cohort.max_students} places` : "Capacité libre"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="lives" className="mt-4">
          {data.liveSessions.length === 0 ? (
            <EmptyState
              icon={Radio}
              title="Aucun direct"
              description="Planifiez votre premier rendez-vous Zoom, Meet, Telegram ou WhatsApp."
              onCreate={() => onCreate("live")}
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {data.liveSessions.map((session) => (
                <Card key={session.id} className="shadow-sm">
                  <CardContent className="flex gap-4 p-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                      <CalendarDays aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="font-serif text-lg font-semibold">{session.title}</h3>
                        <Badge variant="secondary">{statusLabel(session.status)}</Badge>
                      </div>
                      <p className="mt-1 text-sm font-medium">
                        {formatLiveDate(session.starts_at)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {providerLabels[session.provider] ?? session.provider}
                      </p>
                      {session.join_url ? (
                        <a
                          href={session.join_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          Ouvrir le lien <ArrowUpRight size={14} aria-hidden />
                        </a>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="books" className="mt-4">
          {data.books.length === 0 ? (
            <EmptyState
              icon={BookMarked}
              title="Aucun livre"
              description="Ajoutez les livres et supports qui servent de fil conducteur aux cours."
              onCreate={() => onCreate("book")}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.books.map((book) => (
                <Card key={book.id} className="shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--gold)]/15 text-[color:var(--gold-dark)]">
                      <BookMarked aria-hidden />
                    </div>
                    <h3 className="mt-4 font-serif text-xl font-semibold">{book.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {book.author || "Auteur non renseigné"}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                      <span className="text-xs text-muted-foreground">
                        {book.level || "Tous niveaux"}
                      </span>
                      <Badge variant="secondary">{statusLabel(book.status)}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

export function PedagogicalAdmin({ organization, userId }: Props) {
  const queryClient = useQueryClient();
  const [creationKind, setCreationKind] = useState<CreationKind | null>(null);
  const queryKey = ["pedagogical-admin", organization.id] as const;
  const dashboard = useQuery({
    queryKey,
    queryFn: () => loadPedagogicalDashboard(organization.id),
  });
  const createItem = useMutation({
    mutationFn: (input: LearningItemInput) => createLearningItem(organization.id, userId, input),
    onSuccess: async (_, input) => {
      await queryClient.invalidateQueries({ queryKey });
      setCreationKind(null);
      toast.success(
        `${creationLabels[input.kind].title.replace(/^Créer |^Ajouter |^Planifier /, "")} enregistré${input.kind === "subject" ? "e" : ""}.`,
      );
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer cet élément."),
  });

  return (
    <main className="min-h-screen bg-[color:var(--cream)] text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--gold-dark)]">
              <Headphones size={16} aria-hidden />
              Administration · {organization.name}
            </div>
            <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
              Centre pédagogique
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Organisez les enseignements, les classes et les rendez-vous depuis un seul endroit.
            </p>
          </div>
          <Button
            size="lg"
            className="min-h-12 rounded-xl sm:min-w-40"
            onClick={() => setCreationKind("course")}
          >
            <Plus aria-hidden />
            Nouveau cours
          </Button>
        </header>

        <div className="mt-8">
          {dashboard.isPending ? (
            <DashboardLoading />
          ) : dashboard.isError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
              <h2 className="font-semibold">Impossible de charger le centre pédagogique</h2>
              <p className="mt-1 text-sm text-muted-foreground">{dashboard.error.message}</p>
              <Button
                variant="outline"
                className="mt-4 min-h-11"
                onClick={() => dashboard.refetch()}
              >
                Réessayer
              </Button>
            </div>
          ) : (
            <DashboardContent data={dashboard.data} onCreate={setCreationKind} />
          )}
        </div>

        {dashboard.data ? (
          <CreateItemDialog
            kind={creationKind}
            onKindChange={setCreationKind}
            data={dashboard.data}
            isPending={createItem.isPending}
            onSubmit={(input) => createItem.mutate(input)}
          />
        ) : null}
      </div>
    </main>
  );
}
