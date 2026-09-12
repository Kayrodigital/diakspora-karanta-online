import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CirclePlay,
  LoaderCircle,
  Pencil,
  Play,
  Plus,
  Radio,
  Square,
  Video,
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
import { Textarea } from "@/components/ui/textarea";
import {
  createLiveSession,
  liveDurationMinutes,
  liveProviderLabels,
  localDateTimeValue,
  updateLiveSession,
  type LiveProvider,
  type LiveSessionInput,
  type LiveSessionUpdate,
} from "@/features/live/live-data";
import type { Database } from "@/integrations/supabase/types";
import type { TeacherDashboardData } from "./teacher-data";

type LiveSession = Database["public"]["Tables"]["live_sessions"]["Row"];

type Props = {
  organizationId: string;
  userId: string;
  data: TeacherDashboardData;
};

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

function Select({
  id,
  name,
  defaultValue,
  children,
  required,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      required={required}
      className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {children}
    </select>
  );
}

function formInput(form: FormData): LiveSessionInput {
  return {
    title: String(form.get("title") ?? "").trim(),
    description: String(form.get("description") ?? "").trim(),
    provider: String(form.get("provider") ?? "zoom") as LiveProvider,
    startsAt: String(form.get("startsAt") ?? ""),
    durationMinutes: Number(form.get("durationMinutes")) || 60,
    joinUrl: String(form.get("joinUrl") ?? "").trim(),
    courseId: String(form.get("courseId") ?? ""),
    cohortId: String(form.get("cohortId") ?? ""),
  };
}

function SessionDialog({
  session,
  open,
  data,
  pending,
  onClose,
  onSave,
}: {
  session: LiveSession | null;
  open: boolean;
  data: TeacherDashboardData;
  pending: boolean;
  onClose: () => void;
  onSave: (
    input: LiveSessionInput & { replayUrl?: string; status?: LiveSessionUpdate["status"] },
  ) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      ...formInput(form),
      replayUrl: String(form.get("replayUrl") ?? "").trim(),
      status: (String(form.get("status") ?? "scheduled") ||
        "scheduled") as LiveSessionUpdate["status"],
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl sm:max-w-xl">
        <form
          key={session ? `${session.id}-${session.updated_at}` : "new"}
          onSubmit={submit}
          className="grid gap-5"
        >
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {session ? "Gérer le direct" : "Planifier un direct"}
            </DialogTitle>
            <DialogDescription>
              Le rendez-vous sera immédiatement visible par les élèves de la classe choisie.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="Titre" htmlFor="teacher-live-title">
              <Input
                id="teacher-live-title"
                name="title"
                required
                autoFocus
                defaultValue={session?.title ?? ""}
                placeholder="Ex. Lecture et correction du chapitre 2"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Classe" htmlFor="teacher-live-cohort">
                <Select
                  id="teacher-live-cohort"
                  name="cohortId"
                  required
                  defaultValue={session?.cohort_id ?? data.cohorts[0]?.id ?? ""}
                >
                  <option value="" disabled>
                    Choisir une classe
                  </option>
                  {data.cohorts.map((cohort) => (
                    <option key={cohort.id} value={cohort.id}>
                      {cohort.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Cours (facultatif)" htmlFor="teacher-live-course">
                <Select
                  id="teacher-live-course"
                  name="courseId"
                  defaultValue={session?.course_id ?? ""}
                >
                  <option value="">Aucun cours précis</option>
                  {data.courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Outil" htmlFor="teacher-live-provider">
                <Select
                  id="teacher-live-provider"
                  name="provider"
                  defaultValue={session?.provider ?? "zoom"}
                >
                  <option value="zoom">Zoom</option>
                  <option value="google_meet">Google Meet</option>
                  <option value="telegram">Telegram</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="other">Autre</option>
                </Select>
              </Field>
              {session ? (
                <Field label="État" htmlFor="teacher-live-status">
                  <Select id="teacher-live-status" name="status" defaultValue={session.status}>
                    <option value="scheduled">Planifié</option>
                    <option value="live">En direct</option>
                    <option value="completed">Terminé</option>
                    <option value="cancelled">Annulé</option>
                  </Select>
                </Field>
              ) : null}
              <Field label="Date et heure" htmlFor="teacher-live-start">
                <Input
                  id="teacher-live-start"
                  name="startsAt"
                  type="datetime-local"
                  required
                  defaultValue={session ? localDateTimeValue(session.starts_at) : ""}
                />
              </Field>
              <Field label="Durée (minutes)" htmlFor="teacher-live-duration">
                <Input
                  id="teacher-live-duration"
                  name="durationMinutes"
                  type="number"
                  min="15"
                  max="480"
                  required
                  defaultValue={session ? liveDurationMinutes(session) : 60}
                />
              </Field>
            </div>
            <Field label="Lien Zoom, Meet, Telegram ou WhatsApp" htmlFor="teacher-live-url">
              <Input
                id="teacher-live-url"
                name="joinUrl"
                type="url"
                placeholder="https://…"
                defaultValue={session?.join_url ?? ""}
              />
            </Field>
            <Field label="Consigne (facultatif)" htmlFor="teacher-live-description">
              <Textarea
                id="teacher-live-description"
                name="description"
                rows={3}
                defaultValue={session?.description ?? ""}
                placeholder="Ex. Préparez les pages 12 à 18 avant le cours."
              />
            </Field>
            {session ? (
              <Field label="Lien du replay" htmlFor="teacher-live-replay">
                <Input
                  id="teacher-live-replay"
                  name="replayUrl"
                  type="url"
                  placeholder="https://youtube.com/…"
                  defaultValue={session.replay_url ?? ""}
                />
              </Field>
            ) : null}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Fermer
            </Button>
            <Button type="submit" disabled={pending || data.cohorts.length === 0}>
              {pending ? (
                <LoaderCircle className="animate-spin" />
              ) : session ? (
                <Pencil />
              ) : (
                <Plus />
              )}
              {pending ? "Enregistrement…" : session ? "Enregistrer" : "Programmer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export function TeacherLiveSessions({ organizationId, userId, data }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<LiveSession | null>(null);
  const queryKey = ["teacher-dashboard", organizationId, userId];
  const mutation = useMutation({
    mutationFn: async (
      input: LiveSessionInput & { replayUrl?: string; status?: LiveSessionUpdate["status"] },
    ) => {
      if (!selected) return createLiveSession(organizationId, userId, input);
      return updateLiveSession(organizationId, selected, {
        ...input,
        replayUrl: input.replayUrl,
        status: input.status,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      setDialogOpen(false);
      setSelected(null);
      toast.success("Le rendez-vous est à jour dans l’espace des élèves.");
    },
    onError: (error) => toast.error(error.message),
  });
  const quickUpdate = useMutation({
    mutationFn: ({ session, status }: { session: LiveSession; status: "live" | "completed" }) =>
      updateLiveSession(organizationId, session, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      toast.success("État du direct mis à jour.");
    },
    onError: (error) => toast.error(error.message),
  });
  const sessions = [...data.liveSessions].sort(
    (left, right) => new Date(right.starts_at).getTime() - new Date(left.starts_at).getTime(),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Directs et replays</h2>
          <p className="text-sm text-muted-foreground">
            Programmez la séance, ouvrez la salle puis publiez son replay.
          </p>
        </div>
        <Button
          className="min-h-11 rounded-xl"
          onClick={() => {
            setSelected(null);
            setDialogOpen(true);
          }}
          disabled={!data.cohorts.length}
        >
          <Plus /> Planifier un direct
        </Button>
      </div>
      {!data.cohorts.length ? (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Une classe doit vous être attribuée avant de planifier un direct.
        </div>
      ) : null}
      {sessions.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {sessions.map((session) => {
            const cohort = data.cohorts.find((item) => item.id === session.cohort_id);
            return (
              <Card
                key={session.id}
                className={
                  session.status === "live"
                    ? "border-red-300 bg-red-50/30 shadow-sm"
                    : "border-border/60 shadow-sm"
                }
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className={`grid size-11 shrink-0 place-items-center rounded-2xl ${session.status === "live" ? "bg-red-600 text-white" : "bg-primary/10 text-primary"}`}
                    >
                      {session.status === "live" ? (
                        <Radio className="size-5" />
                      ) : (
                        <CalendarDays className="size-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-semibold">{session.title}</p>
                        <Badge variant={session.status === "live" ? "destructive" : "secondary"}>
                          {session.status === "scheduled"
                            ? "Planifié"
                            : session.status === "live"
                              ? "En direct"
                              : session.status === "completed"
                                ? "Terminé"
                                : "Annulé"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm">
                        {dateFormatter.format(new Date(session.starts_at))}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {liveProviderLabels[session.provider] ?? session.provider} ·{" "}
                        {cohort?.name ?? "Classe"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-4 sm:flex">
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-10"
                      onClick={() => {
                        setSelected(session);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil /> Gérer
                    </Button>
                    {session.status === "scheduled" ? (
                      <Button
                        size="sm"
                        className="min-h-10"
                        onClick={() => quickUpdate.mutate({ session, status: "live" })}
                      >
                        <Play /> Démarrer
                      </Button>
                    ) : null}
                    {session.status === "live" ? (
                      <Button
                        size="sm"
                        className="min-h-10"
                        onClick={() => quickUpdate.mutate({ session, status: "completed" })}
                      >
                        <Square /> Terminer
                      </Button>
                    ) : null}
                    {session.join_url ? (
                      <Button asChild size="sm" variant="secondary" className="min-h-10">
                        <a href={session.join_url} target="_blank" rel="noreferrer">
                          <Video /> Salle
                        </a>
                      </Button>
                    ) : null}
                    {session.replay_url ? (
                      <Button asChild size="sm" variant="secondary" className="min-h-10">
                        <a href={session.replay_url} target="_blank" rel="noreferrer">
                          <CirclePlay /> Replay
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed p-8 text-center">
          <Video className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">Aucun direct créé</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Votre premier rendez-vous apparaîtra ici.
          </p>
        </div>
      )}
      <SessionDialog
        session={selected}
        open={dialogOpen}
        data={data}
        pending={mutation.isPending}
        onClose={() => {
          setDialogOpen(false);
          setSelected(null);
        }}
        onSave={(input) => mutation.mutate(input)}
      />
    </div>
  );
}
