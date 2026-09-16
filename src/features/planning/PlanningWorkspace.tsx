import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  Clock3,
  ExternalLink,
  GraduationCap,
  ListChecks,
  LoaderCircle,
  Plus,
  Radio,
  School,
  Settings2,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/integrations/supabase/types";
import type { OrganizationBrand, OrganizationRole } from "@/lib/auth/portal-access";
import { organizationTheme } from "@/lib/organization-theme";
import {
  attendanceLabels,
  checkSessionConflicts,
  createClass,
  createSessions,
  loadPlanningData,
  reportPlanningIncident,
  requirementLabels,
  saveAttendance,
  togglePlanningPreference,
  updateSession,
  weekdayLabels,
  type ClassInput,
  type PlanningConflict,
  type PlanningData,
  type SessionInput,
} from "./planning-data";

type Cohort = Database["public"]["Tables"]["cohorts"]["Row"];
type Session = Database["public"]["Tables"]["live_sessions"]["Row"];

type Props = {
  organization: OrganizationBrand;
  role: OrganizationRole;
  userId: string;
};

function Select({
  id,
  name,
  children,
  defaultValue,
  value,
  onChange,
  required,
}: {
  id: string;
  name?: string;
  children: ReactNode;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      value={value}
      required={required}
      onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      className="min-h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25"
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

const audienceLabels: Record<string, string> = {
  child: "Enfants · mixte · 6–13 ans",
  teen_female: "Adolescentes · filles · 14–17 ans",
  teen_male: "Adolescents · garçons · 14–17 ans",
  adult_female: "Adultes · femmes",
  adult_male: "Adultes · hommes",
};

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  scheduled: "Programmé",
  live: "En direct",
  completed: "Terminé",
  cancelled: "Annulé",
  rescheduled: "Reporté",
};

const statusStyles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  scheduled: "bg-blue-50 text-blue-700",
  live: "bg-red-50 text-red-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-700 line-through",
  rescheduled: "bg-amber-50 text-amber-800",
};

function toLocalInput(date: Date) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

function dateKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string, timezone?: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

function genderForAudience(audience: string) {
  if (audience.endsWith("female")) return "female_only";
  if (audience.endsWith("male")) return "male_only";
  return "mixed";
}

function agesForAudience(audience: string): [number | undefined, number | undefined] {
  if (audience === "child") return [6, 13];
  if (audience.startsWith("teen")) return [14, 17];
  return [18, undefined];
}

function ClassDialog({
  open,
  data,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  data: PlanningData;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: ClassInput) => void;
}) {
  const [audience, setAudience] = useState("child");
  const [isPublic, setIsPublic] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const [ageMin, ageMax] = agesForAudience(audience);
    onSubmit({
      name: String(form.get("name") ?? ""),
      code: String(form.get("code") ?? ""),
      audience,
      ageMin,
      ageMax,
      genderPolicy: genderForAudience(audience),
      subjectId: String(form.get("subjectId") ?? ""),
      objective: String(form.get("objective") ?? "islamic_studies"),
      level: String(form.get("level") ?? ""),
      teachingLanguages: String(form.get("languages") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      teacherId: String(form.get("teacherId") ?? ""),
      maxStudents: Number(form.get("maxStudents")) || 1,
      startsOn: String(form.get("startsOn") ?? ""),
      endsOn: String(form.get("endsOn") ?? ""),
      usualWeekday: form.get("usualWeekday") === "" ? undefined : Number(form.get("usualWeekday")),
      usualStartTime: String(form.get("usualStartTime") ?? ""),
      usualEndTime: String(form.get("usualEndTime") ?? ""),
      timezone: String(form.get("timezone") ?? "Europe/Paris"),
      deliveryFormat: String(form.get("deliveryFormat") ?? "live"),
      enrollmentStatus: String(form.get("enrollmentStatus") ?? "closed"),
      isPublic,
      publicSummary: String(form.get("publicSummary") ?? ""),
    });
  }
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Créer une classe</DialogTitle>
            <DialogDescription>
              La règle de mixité est appliquée automatiquement selon le public.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom public" htmlFor="class-name">
              <Input id="class-name" name="name" required />
            </Field>
            <Field label="Code interne" htmlFor="class-code">
              <Input id="class-code" name="code" required />
            </Field>
            <Field label="Public" htmlFor="class-audience">
              <Select id="class-audience" value={audience} onChange={setAudience} required>
                {Object.entries(audienceLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Discipline" htmlFor="class-subject">
              <Select id="class-subject" name="subjectId">
                <option value="">Non précisée</option>
                {data.subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Objectif" htmlFor="class-objective">
              <Select id="class-objective" name="objective" defaultValue="islamic_studies">
                <option value="arabic_literacy">Lire l’arabe</option>
                <option value="arabic_language">Langue arabe</option>
                <option value="quran_tajwid">Coran et tajwid</option>
                <option value="islamic_studies">Sciences islamiques</option>
                <option value="advanced_texts">Textes avancés</option>
              </Select>
            </Field>
            <Field label="Niveau" htmlFor="class-level">
              <Input id="class-level" name="level" placeholder="Débutant, avancé…" />
            </Field>
            <Field label="Langues (séparées par une virgule)" htmlFor="class-languages">
              <Input id="class-languages" name="languages" required placeholder="français, arabe" />
            </Field>
            <Field label="Professeur principal" htmlFor="class-teacher">
              <Select id="class-teacher" name="teacherId">
                <option value="">À affecter</option>
                {data.teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Capacité" htmlFor="class-capacity">
              <Input
                id="class-capacity"
                name="maxStudents"
                type="number"
                min="1"
                required
                defaultValue="12"
              />
            </Field>
            <Field label="Format" htmlFor="class-format">
              <Select id="class-format" name="deliveryFormat" defaultValue="live">
                <option value="live">Direct</option>
                <option value="hybrid">Hybride</option>
                <option value="on_demand">Autonomie</option>
              </Select>
            </Field>
            <Field label="Début" htmlFor="class-start">
              <Input id="class-start" name="startsOn" type="date" />
            </Field>
            <Field label="Fin" htmlFor="class-end">
              <Input id="class-end" name="endsOn" type="date" />
            </Field>
            <Field label="Jour habituel" htmlFor="class-weekday">
              <Select id="class-weekday" name="usualWeekday">
                <option value="">À définir</option>
                {weekdayLabels.map((label, index) => (
                  <option key={label} value={index}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Début habituel" htmlFor="class-time-start">
                <Input id="class-time-start" name="usualStartTime" type="time" />
              </Field>
              <Field label="Fin habituelle" htmlFor="class-time-end">
                <Input id="class-time-end" name="usualEndTime" type="time" />
              </Field>
            </div>
            <Field label="Fuseau horaire" htmlFor="class-timezone">
              <Input id="class-timezone" name="timezone" defaultValue="Europe/Paris" required />
            </Field>
            <Field label="Inscriptions" htmlFor="class-enrollment">
              <Select id="class-enrollment" name="enrollmentStatus" defaultValue="closed">
                <option value="closed">Fermées</option>
                <option value="open">Ouvertes</option>
                <option value="waitlist">Liste d’attente</option>
              </Select>
            </Field>
          </div>
          <Field label="Résumé public" htmlFor="class-summary">
            <Textarea
              id="class-summary"
              name="publicSummary"
              required={isPublic}
              placeholder="Ce que l’élève va apprendre, en langage simple."
            />
          </Field>
          <div className="flex min-h-11 items-center justify-between rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">Visible sur le parcours public</p>
              <p className="text-xs text-muted-foreground">
                Seulement si toutes les informations obligatoires sont présentes.
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button disabled={pending}>
              {pending && <LoaderCircle className="size-4 animate-spin" />} Créer la classe
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SessionDialog({
  open,
  data,
  canManage,
  pending,
  conflicts,
  onClose,
  onCheck,
  onSubmit,
}: {
  open: boolean;
  data: PlanningData;
  canManage: boolean;
  pending: boolean;
  conflicts: PlanningConflict[];
  onClose: () => void;
  onCheck: (cohort: Cohort, input: SessionInput) => void;
  onSubmit: (cohort: Cohort, input: SessionInput) => void;
}) {
  const [cohortId, setCohortId] = useState(data.cohorts[0]?.id ?? "");
  const [draft, setDraft] = useState<SessionInput | null>(null);
  const cohort = data.cohorts.find((item) => item.id === cohortId);
  function parse(form: FormData): SessionInput {
    return {
      cohortId,
      courseId: String(form.get("courseId") ?? ""),
      title: String(form.get("title") ?? ""),
      startsAt: String(form.get("startsAt") ?? ""),
      endsAt: String(form.get("endsAt") ?? ""),
      timezone: String(form.get("timezone") ?? "Europe/Paris"),
      provider: String(form.get("provider") ?? "zoom"),
      joinUrl: String(form.get("joinUrl") ?? ""),
      attendanceRequirement: String(form.get("attendanceRequirement") ?? "required"),
      maxAttendees: Number(form.get("maxAttendees")) || undefined,
      replayDelayHours: Number(form.get("replayDelayHours")) || undefined,
      internalNotes: String(form.get("internalNotes") ?? ""),
      recurrenceWeeks: Number(form.get("recurrenceWeeks")) || 1,
      notify: form.get("notify") === "on",
      overrideReason: String(form.get("overrideReason") ?? ""),
    };
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cohort) return;
    const input = parse(new FormData(event.currentTarget));
    if (draft && conflicts.length === 0) onSubmit(cohort, input);
    else {
      setDraft(input);
      onCheck(cohort, input);
    }
  }
  const now = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 60 * 60 * 1000);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Planifier une séance</DialogTitle>
            <DialogDescription>
              Le professeur et le créneau habituel sont repris depuis la classe lorsque c’est
              possible.
            </DialogDescription>
          </DialogHeader>
          {conflicts.length > 0 && (
            <div className="space-y-2" role="alert">
              {conflicts.map((item) => (
                <div
                  key={item.code}
                  className={`rounded-xl border p-3 text-sm ${item.severity === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}
                >
                  <AlertTriangle className="mr-2 inline size-4" />
                  {item.message}
                </div>
              ))}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Classe" htmlFor="session-class">
              <Select
                id="session-class"
                value={cohortId}
                onChange={(value) => {
                  setCohortId(value);
                  setDraft(null);
                }}
                required
              >
                <option value="" disabled>
                  Choisir
                </option>
                {data.cohorts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cours associé" htmlFor="session-course">
              <Select id="session-course" name="courseId">
                <option value="">Aucun cours précis</option>
                {data.courses
                  .filter((course) =>
                    data.courseAssignments.some(
                      (assignment) =>
                        assignment.cohort_id === cohortId && assignment.course_id === course.id,
                    ),
                  )
                  .map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Titre" htmlFor="session-title">
              <Input id="session-title" name="title" required />
            </Field>
            <Field label="Présence" htmlFor="session-presence">
              <Select id="session-presence" name="attendanceRequirement" defaultValue="required">
                {Object.entries(requirementLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Début" htmlFor="session-start">
              <Input
                id="session-start"
                name="startsAt"
                type="datetime-local"
                required
                defaultValue={toLocalInput(now)}
              />
            </Field>
            <Field label="Fin" htmlFor="session-end">
              <Input
                id="session-end"
                name="endsAt"
                type="datetime-local"
                required
                defaultValue={toLocalInput(end)}
              />
            </Field>
            <Field label="Fuseau horaire" htmlFor="session-timezone">
              <Input
                id="session-timezone"
                name="timezone"
                required
                defaultValue={cohort?.timezone ?? "Europe/Paris"}
              />
            </Field>
            <Field label="Outil" htmlFor="session-provider">
              <Select id="session-provider" name="provider" defaultValue="zoom">
                <option value="zoom">Zoom</option>
                <option value="google_meet">Google Meet</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
                <option value="other">Autre</option>
              </Select>
            </Field>
            <Field label="Lien de connexion" htmlFor="session-url">
              <Input id="session-url" name="joinUrl" type="url" placeholder="https://…" />
            </Field>
            <Field label="Capacité" htmlFor="session-capacity">
              <Input
                id="session-capacity"
                name="maxAttendees"
                type="number"
                min="1"
                defaultValue={cohort?.max_students ?? undefined}
              />
            </Field>
            <Field label="Nombre de semaines" htmlFor="session-repeat">
              <Input
                id="session-repeat"
                name="recurrenceWeeks"
                type="number"
                min="1"
                max="52"
                defaultValue="1"
              />
            </Field>
            <Field label="Replay attendu sous (heures)" htmlFor="session-replay-delay">
              <Input
                id="session-replay-delay"
                name="replayDelayHours"
                type="number"
                min="1"
                defaultValue="48"
              />
            </Field>
          </div>
          <Field label="Remarques internes" htmlFor="session-notes">
            <Textarea id="session-notes" name="internalNotes" />
          </Field>
          {canManage && conflicts.some((item) => item.severity === "error") && (
            <Field label="Justification de l’exception" htmlFor="session-override">
              <Textarea
                id="session-override"
                name="overrideReason"
                required
                placeholder="Expliquez pourquoi ce conflit peut être accepté."
              />
            </Field>
          )}
          <label className="flex min-h-11 items-center gap-3 rounded-xl border p-3 text-sm">
            <input type="checkbox" name="notify" defaultChecked /> Notifier les personnes concernées
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button disabled={pending}>
              {pending && <LoaderCircle className="size-4 animate-spin" />}
              {draft ? "Confirmer la séance" : "Vérifier le créneau"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AttendanceDialog({
  session,
  data,
  userId,
  pending,
  onClose,
  onSave,
}: {
  session: Session | null;
  data: PlanningData;
  userId: string;
  pending: boolean;
  onClose: () => void;
  onSave: (entries: Array<{ learnerId: string; status: string }>) => void;
}) {
  if (!session) return null;
  const learnerIds = data.learnerMemberships
    .filter((item) => item.cohort_id === session.cohort_id && item.status === "active")
    .map((item) => item.learner_id);
  const learners = data.learners.filter((learner) => learnerIds.includes(learner.id));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave(
      learners.map((learner) => ({
        learnerId: learner.id,
        status: String(form.get(learner.id) ?? "not_required"),
      })),
    );
  }
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl sm:max-w-xl">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Faire l’appel</DialogTitle>
            <DialogDescription>
              {session.title} · les modifications restent historisées.
            </DialogDescription>
          </DialogHeader>
          {learners.length ? (
            <div className="space-y-3">
              {learners.map((learner) => {
                const current =
                  data.attendance.find(
                    (item) => item.live_session_id === session.id && item.learner_id === learner.id,
                  )?.status ??
                  (session.attendance_requirement === "not_required" ? "not_required" : "present");
                return (
                  <div
                    key={learner.id}
                    className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_13rem] sm:items-center"
                  >
                    <p className="font-medium">{learner.preferred_name || learner.full_name}</p>
                    <Select
                      id={`attendance-${learner.id}`}
                      name={learner.id}
                      defaultValue={current}
                    >
                      {Object.entries(attendanceLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Aucun élève inscrit dans cette classe.
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Fermer
            </Button>
            <Button disabled={pending || !learners.length}>
              {pending && <LoaderCircle className="size-4 animate-spin" />} Enregistrer l’appel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ClassOverview({
  cohort,
  data,
  onClose,
}: {
  cohort: Cohort | null;
  data: PlanningData;
  onClose: () => void;
}) {
  if (!cohort) return null;
  const memberships = data.learnerMemberships.filter(
    (item) => item.cohort_id === cohort.id && item.status === "active",
  );
  const sessions = data.sessions.filter((item) => item.cohort_id === cohort.id);
  const completedIds = new Set(
    sessions.filter((item) => item.status === "completed").map((item) => item.id),
  );
  const records = data.attendance.filter(
    (item) => completedIds.has(item.live_session_id) && item.status !== "not_required",
  );
  const present = records.filter((item) => ["present", "late"].includes(item.status)).length;
  const rate = records.length ? Math.round((present / records.length) * 100) : null;
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{cohort.name}</DialogTitle>
          <DialogDescription>Vue complète de la classe</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label="Élèves"
            value={`${memberships.length}${cohort.max_students ? `/${cohort.max_students}` : ""}`}
          />
          <Stat
            label="Places restantes"
            value={
              cohort.max_students
                ? String(Math.max(0, cohort.max_students - memberships.length))
                : "—"
            }
          />
          <Stat label="Présence moyenne" value={rate === null ? "—" : `${rate}%`} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Info label="Public" value={audienceLabels[cohort.audience ?? ""] ?? "À préciser"} />
          <Info label="Langues" value={cohort.teaching_languages.join(", ") || "À préciser"} />
          <Info label="Fuseau" value={cohort.timezone} />
          <Info label="Statut public" value={cohort.is_public ? "Visible" : "Non publiée"} />
        </div>
        <div>
          <h3 className="font-semibold">Prochaines séances</h3>
          <div className="mt-2 space-y-2">
            {sessions
              .filter((item) => new Date(item.starts_at) > new Date())
              .slice(0, 4)
              .map((item) => (
                <p key={item.id} className="rounded-xl bg-muted/50 p-3 text-sm">
                  {formatDate(item.starts_at, item.timezone)} · {item.title}
                </p>
              ))}
            {!sessions.some((item) => new Date(item.starts_at) > new Date()) && (
              <p className="text-sm text-muted-foreground">Aucune séance programmée.</p>
            )}
          </div>
        </div>
        <div className="rounded-xl border p-4">
          <p className="font-semibold">Suivi opérationnel</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {
              sessions.filter(
                (item) =>
                  item.replay_due_at &&
                  !item.replay_url &&
                  new Date(item.replay_due_at) < new Date(),
              ).length
            }{" "}
            replay(s) en retard ·{" "}
            {
              data.incidents.filter((item) =>
                sessions.some((session) => session.id === item.live_session_id),
              ).length
            }{" "}
            incident(s) ouvert(s).
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

export function PlanningWorkspace({ organization, role, userId }: Props) {
  const queryClient = useQueryClient();
  const canManage = ["owner", "admin", "pedagogical_manager", "class_manager"].includes(role);
  const [view, setView] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState(new Date());
  const [classOpen, setClassOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [attendanceSession, setAttendanceSession] = useState<Session | null>(null);
  const [selectedClass, setSelectedClass] = useState<Cohort | null>(null);
  const [conflicts, setConflicts] = useState<PlanningConflict[]>([]);
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryKey = ["planning", organization.id, userId];
  const query = useQuery({ queryKey, queryFn: () => loadPlanningData(organization.id) });
  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const classMutation = useMutation({
    mutationFn: (input: ClassInput) => createClass(organization.id, input),
    onSuccess: () => {
      setClassOpen(false);
      refresh();
      toast.success("Classe créée.");
    },
    onError: (error) => toast.error(error.message),
  });
  const checkMutation = useMutation({
    mutationFn: ({ cohort, input }: { cohort: Cohort; input: SessionInput }) =>
      checkSessionConflicts(organization.id, cohort, input),
    onSuccess: (items) => {
      setConflicts(items);
      if (!items.length) toast.success("Aucun conflit détecté. Confirmez la séance.");
    },
    onError: (error) => toast.error(error.message),
  });
  const sessionMutation = useMutation({
    mutationFn: ({ cohort, input }: { cohort: Cohort; input: SessionInput }) =>
      createSessions(organization.id, userId, cohort, input),
    onSuccess: () => {
      setSessionOpen(false);
      setConflicts([]);
      refresh();
      toast.success("Séance planifiée.");
    },
    onError: (error) => toast.error(error.message),
  });
  const attendanceMutation = useMutation({
    mutationFn: (entries: Array<{ learnerId: string; status: string }>) =>
      saveAttendance(organization.id, userId, attendanceSession!.id, entries),
    onSuccess: () => {
      setAttendanceSession(null);
      refresh();
      toast.success("Appel enregistré.");
    },
    onError: (error) => toast.error(error.message),
  });
  const preferenceMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      togglePlanningPreference(id, active),
    onSuccess: refresh,
    onError: (error) => toast.error(error.message),
  });

  const data = query.data;
  const bounds = useMemo(() => {
    const start = new Date(cursor);
    if (view === "week") start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    else start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    if (view === "week") end.setDate(end.getDate() + 7);
    else end.setMonth(end.getMonth() + 1);
    return { start, end };
  }, [cursor, view]);
  const filteredSessions = useMemo(
    () =>
      (data?.sessions ?? []).filter((session) => {
        const date = new Date(session.starts_at);
        const cohort = data?.cohorts.find((item) => item.id === session.cohort_id);
        return (
          date >= bounds.start &&
          date < bounds.end &&
          (teacherFilter === "all" || session.host_user_id === teacherFilter) &&
          (classFilter === "all" || session.cohort_id === classFilter) &&
          (audienceFilter === "all" || cohort?.audience === audienceFilter) &&
          (statusFilter === "all" || session.status === statusFilter)
        );
      }),
    [data, bounds, teacherFilter, classFilter, audienceFilter, statusFilter],
  );
  const grouped = useMemo(
    () =>
      Object.entries(
        filteredSessions.reduce<Record<string, Session[]>>((result, session) => {
          (result[dateKey(session.starts_at)] ??= []).push(session);
          return result;
        }, {}),
      ).sort(([left], [right]) => left.localeCompare(right)),
    [filteredSessions],
  );

  if (query.isLoading)
    return (
      <div className="mx-auto max-w-7xl space-y-4 p-5">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  if (query.error || !data)
    return (
      <div className="mx-auto max-w-3xl p-5">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
          <h1 className="font-semibold">Le planning ne peut pas être chargé</h1>
          <p className="mt-1 text-sm">
            {query.error?.message ?? "Réessayez dans quelques instants."}
          </p>
          <Button className="mt-4" variant="outline" onClick={() => query.refetch()}>
            Réessayer
          </Button>
        </div>
      </div>
    );

  const today = data.sessions.filter(
    (session) =>
      dateKey(session.starts_at) === dateKey(new Date().toISOString()) &&
      !["cancelled", "completed"].includes(session.status),
  );
  const next = data.sessions
    .filter(
      (session) =>
        new Date(session.starts_at) > new Date() &&
        !["cancelled", "completed"].includes(session.status),
    )
    .slice(0, 5);
  const move = (direction: number) =>
    setCursor((current) => {
      const date = new Date(current);
      if (view === "week") date.setDate(date.getDate() + direction * 7);
      else date.setMonth(date.getMonth() + direction);
      return date;
    });

  return (
    <div
      className="min-h-screen bg-[color:var(--cream)] text-foreground"
      style={organizationTheme(organization)}
    >
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to={role === "teacher" ? "/professeur" : "/admin"}
              className="text-xs font-semibold text-primary"
            >
              ← Retour à mon espace
            </Link>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--gold-dark)]">
              Classes et planning
            </p>
            <h1 className="mt-1 font-serif text-3xl">Organiser les cours simplement</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Heures affichées dans votre fuseau local · règles métier contrôlées avant validation.
            </p>
          </div>
          {canManage && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="min-h-11" onClick={() => setClassOpen(true)}>
                <School className="size-4" /> Nouvelle classe
              </Button>
              <Button className="min-h-11" onClick={() => setSessionOpen(true)}>
                <Plus className="size-4" /> Planifier
              </Button>
            </div>
          )}
        </header>

        {role === "teacher" && (
          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="size-5 text-red-600" /> Aujourd’hui
                </CardTitle>
              </CardHeader>
              <CardContent>
                {today.length ? (
                  today.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      data={data}
                      primary
                      onAttendance={() => setAttendanceSession(session)}
                      onRefresh={refresh}
                      userId={userId}
                      organizationId={organization.id}
                    />
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                    Aucun cours aujourd’hui.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Mes prochains cours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {next.length ? (
                  next.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      data={data}
                      onAttendance={() => setAttendanceSession(session)}
                      onRefresh={refresh}
                      userId={userId}
                      organizationId={organization.id}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune séance programmée.</p>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        <Tabs defaultValue="calendar" className="mt-6">
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl p-1 sm:w-fit">
            <TabsTrigger value="calendar" className="min-h-11">
              Calendrier
            </TabsTrigger>
            <TabsTrigger value="classes" className="min-h-11">
              Classes
            </TabsTrigger>
            <TabsTrigger value="settings" className="min-h-11">
              Créneaux
            </TabsTrigger>
          </TabsList>
          <TabsContent value="calendar" className="mt-5 space-y-4">
            <div className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select id="filter-teacher" value={teacherFilter} onChange={setTeacherFilter}>
                <option value="all">Tous les professeurs</option>
                {data.teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </Select>
              <Select id="filter-class" value={classFilter} onChange={setClassFilter}>
                <option value="all">Toutes les classes</option>
                {data.cohorts.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.name}
                  </option>
                ))}
              </Select>
              <Select id="filter-audience" value={audienceFilter} onChange={setAudienceFilter}>
                <option value="all">Tous les publics</option>
                {Object.entries(audienceLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Select id="filter-status" value={statusFilter} onChange={setStatusFilter}>
                <option value="all">Tous les statuts</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Période précédente"
                  onClick={() => move(-1)}
                >
                  <ChevronLeft />
                </Button>
                <Button variant="outline" onClick={() => setCursor(new Date())}>
                  Aujourd’hui
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Période suivante"
                  onClick={() => move(1)}
                >
                  <ChevronRight />
                </Button>
              </div>
              <p className="font-semibold capitalize">
                {new Intl.DateTimeFormat("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(bounds.start)}{" "}
                —{" "}
                {new Intl.DateTimeFormat("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(new Date(bounds.end.getTime() - 1))}
              </p>
              <div className="flex rounded-xl border p-1">
                <Button
                  size="sm"
                  variant={view === "week" ? "default" : "ghost"}
                  onClick={() => setView("week")}
                >
                  Semaine
                </Button>
                <Button
                  size="sm"
                  variant={view === "month" ? "default" : "ghost"}
                  onClick={() => setView("month")}
                >
                  Mois
                </Button>
              </div>
            </div>
            {grouped.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {grouped.map(([day, sessions]) => (
                  <Card key={day}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base capitalize">
                        {new Intl.DateTimeFormat("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        }).format(new Date(`${day}T12:00:00`))}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {sessions.map((session) => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          data={data}
                          onAttendance={() => setAttendanceSession(session)}
                          onRefresh={refresh}
                          userId={userId}
                          organizationId={organization.id}
                        />
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed bg-card p-10 text-center">
                <CalendarDays className="mx-auto size-9 text-primary" />
                <h2 className="mt-3 font-semibold">Aucune séance sur cette période</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Modifiez les filtres ou planifiez une nouvelle séance.
                </p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="classes" className="mt-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.cohorts.map((cohort) => {
                const count = data.learnerMemberships.filter(
                  (item) => item.cohort_id === cohort.id && item.status === "active",
                ).length;
                return (
                  <Card key={cohort.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="secondary">
                          {audienceLabels[cohort.audience ?? ""] ?? "Public à préciser"}
                        </Badge>
                        <Badge variant={cohort.is_public ? "default" : "outline"}>
                          {cohort.is_public ? "Publique" : "Interne"}
                        </Badge>
                      </div>
                      <h2 className="mt-4 text-xl font-semibold">{cohort.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {cohort.public_summary || cohort.description || "Aucun résumé renseigné."}
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Stat
                          label="Élèves"
                          value={`${count}${cohort.max_students ? `/${cohort.max_students}` : ""}`}
                        />
                        <Stat
                          label="Séances à venir"
                          value={String(
                            data.sessions.filter(
                              (item) =>
                                item.cohort_id === cohort.id &&
                                new Date(item.starts_at) > new Date(),
                            ).length,
                          )}
                        />
                      </div>
                      <Button
                        variant="outline"
                        className="mt-4 min-h-11 w-full"
                        onClick={() => setSelectedClass(cohort)}
                      >
                        Voir la fiche complète
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {!data.cohorts.length && (
              <div className="rounded-3xl border border-dashed bg-card p-10 text-center">
                <School className="mx-auto size-9 text-primary" />
                <p className="mt-3 font-semibold">Aucune classe</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="settings" className="mt-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="size-5" /> Plages recommandées
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ces créneaux guident l’équipe sans interdire les exceptions justifiées.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {data.preferences.map((preference) => (
                  <div
                    key={preference.id}
                    className="flex min-h-16 items-center justify-between gap-3 rounded-xl border p-3"
                  >
                    <div>
                      <p className="font-medium">{preference.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {preference.audience_group === "child"
                          ? "Enfants"
                          : preference.audience_group === "teen"
                            ? "Adolescents"
                            : "Adultes"}{" "}
                        · {preference.starts_at.slice(0, 5)}–{preference.ends_at.slice(0, 5)}
                      </p>
                    </div>
                    <Switch
                      checked={preference.active}
                      disabled={!canManage || preferenceMutation.isPending}
                      onCheckedChange={(active) =>
                        preferenceMutation.mutate({ id: preference.id, active })
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <ClassDialog
        open={classOpen}
        data={data}
        pending={classMutation.isPending}
        onClose={() => setClassOpen(false)}
        onSubmit={(input) => classMutation.mutate(input)}
      />
      <SessionDialog
        open={sessionOpen}
        data={data}
        canManage={canManage}
        pending={checkMutation.isPending || sessionMutation.isPending}
        conflicts={conflicts}
        onClose={() => {
          setSessionOpen(false);
          setConflicts([]);
        }}
        onCheck={(cohort, input) => checkMutation.mutate({ cohort, input })}
        onSubmit={(cohort, input) => sessionMutation.mutate({ cohort, input })}
      />
      <AttendanceDialog
        session={attendanceSession}
        data={data}
        userId={userId}
        pending={attendanceMutation.isPending}
        onClose={() => setAttendanceSession(null)}
        onSave={(entries) => attendanceMutation.mutate(entries)}
      />
      <ClassOverview cohort={selectedClass} data={data} onClose={() => setSelectedClass(null)} />
    </div>
  );
}

function SessionCard({
  session,
  data,
  primary,
  onAttendance,
  onRefresh,
  organizationId,
  userId,
}: {
  session: Session;
  data: PlanningData;
  primary?: boolean;
  onAttendance: () => void;
  onRefresh: () => void;
  organizationId: string;
  userId: string;
}) {
  const cohort = data.cohorts.find((item) => item.id === session.cohort_id);
  const [replay, setReplay] = useState("");
  const [issue, setIssue] = useState(false);
  const actionMutation = useMutation({
    mutationFn: (input: Database["public"]["Tables"]["live_sessions"]["Update"]) =>
      updateSession(organizationId, session.id, input),
    onSuccess: () => {
      onRefresh();
      toast.success("Séance mise à jour.");
    },
    onError: (error) => toast.error(error.message),
  });
  const incidentMutation = useMutation({
    mutationFn: () =>
      reportPlanningIncident(
        organizationId,
        userId,
        session.id,
        "technical",
        "Problème signalé depuis le planning du professeur.",
      ),
    onSuccess: () => {
      setIssue(false);
      onRefresh();
      toast.success("Problème signalé à l’équipe.");
    },
    onError: (error) => toast.error(error.message),
  });
  const joinSoon = new Date(session.starts_at).getTime() - Date.now() <= 30 * 60_000;
  return (
    <article
      className={`rounded-2xl border p-4 ${primary ? "border-primary/30 bg-primary/5" : "bg-background"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge className={statusStyles[session.status]}>
              {statusLabels[session.status] ?? session.status}
            </Badge>
            <Badge variant="outline">
              {requirementLabels[session.attendance_requirement] ?? session.attendance_requirement}
            </Badge>
          </div>
          <h3 className="mt-2 font-semibold">{session.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {cohort?.name ?? "Classe"} · {formatDate(session.starts_at, session.timezone)} ·{" "}
            {session.timezone}
          </p>
        </div>
        <Video className="size-5 shrink-0 text-primary" />
      </div>
      {!session.join_url &&
        new Date(session.starts_at).getTime() - Date.now() < 24 * 60 * 60_000 &&
        session.status === "scheduled" && (
          <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
            <AlertTriangle className="mr-1 inline size-3" />
            Lien de connexion manquant pour ce cours proche.
          </p>
        )}
      <div className="mt-4 flex flex-wrap gap-2">
        {session.join_url && joinSoon && (
          <Button asChild className="min-h-11">
            <a href={session.join_url} target="_blank" rel="noreferrer">
              <CirclePlay className="size-4" /> Démarrer le cours
            </a>
          </Button>
        )}
        {session.join_url && !joinSoon && (
          <Button asChild variant="outline" className="min-h-11">
            <a href={session.join_url} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> Lien Zoom
            </a>
          </Button>
        )}
        <Button variant="outline" className="min-h-11" onClick={onAttendance}>
          <ListChecks className="size-4" /> Faire l’appel
        </Button>
        {session.status === "scheduled" && (
          <Button
            variant="ghost"
            className="min-h-11"
            onClick={() =>
              actionMutation.mutate({
                status: "rescheduled",
                change_reason: "Report demandé par le professeur",
              })
            }
          >
            Demander un report
          </Button>
        )}
        <Button variant="ghost" className="min-h-11" onClick={() => setIssue(true)}>
          Signaler un problème
        </Button>
      </div>
      {session.status === "completed" && !session.replay_url && (
        <div className="mt-3 flex gap-2">
          <Input
            value={replay}
            onChange={(event) => setReplay(event.target.value)}
            placeholder="Lien du replay"
            aria-label="Lien du replay"
          />
          <Button
            disabled={!replay || actionMutation.isPending}
            onClick={() => actionMutation.mutate({ replay_url: replay, recording_status: "ready" })}
          >
            Ajouter
          </Button>
        </div>
      )}
      {issue && (
        <div className="mt-3 rounded-xl border bg-muted/30 p-3 text-sm">
          <p>Confirmer le signalement à l’équipe administrative ?</p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              onClick={() => incidentMutation.mutate()}
              disabled={incidentMutation.isPending}
            >
              Confirmer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIssue(false)}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
