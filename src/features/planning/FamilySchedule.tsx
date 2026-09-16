import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarDays, CirclePlay, Clock3, LoaderCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { reportAbsence, requirementLabels } from "./planning-data";

type Props = { organizationId: string; userId: string };

async function loadFamilySchedule(organizationId: string, userId: string) {
  const [learners, memberships, sessions, attendance, reports] = await Promise.all([
    supabase
      .from("learner_profiles")
      .select("id, full_name, preferred_name")
      .eq("organization_id", organizationId)
      .eq("guardian_user_id", userId)
      .eq("status", "active"),
    supabase
      .from("learner_cohort_memberships")
      .select("learner_id, cohort_id")
      .eq("organization_id", organizationId)
      .eq("status", "active"),
    supabase
      .from("live_sessions")
      .select("*")
      .eq("organization_id", organizationId)
      .in("status", ["scheduled", "live", "completed", "cancelled", "rescheduled"])
      .gte("starts_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("starts_at"),
    supabase.from("session_attendance").select("*").eq("organization_id", organizationId),
    supabase.from("session_absence_reports").select("*").eq("organization_id", organizationId),
  ]);
  const error = [
    learners.error,
    memberships.error,
    sessions.error,
    attendance.error,
    reports.error,
  ].find(Boolean);
  if (error) throw error;
  return {
    learners: learners.data ?? [],
    memberships: memberships.data ?? [],
    sessions: sessions.data ?? [],
    attendance: attendance.data ?? [],
    reports: reports.data ?? [],
  };
}

function localDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

export function FamilySchedule({ organizationId, userId }: Props) {
  const query = useQuery({
    queryKey: ["family-schedule", organizationId, userId],
    queryFn: () => loadFamilySchedule(organizationId, userId),
  });
  const absenceMutation = useMutation({
    mutationFn: ({
      sessionId,
      learnerId,
      reason,
    }: {
      sessionId: string;
      learnerId: string;
      reason: string;
    }) => reportAbsence(organizationId, userId, sessionId, learnerId, reason),
    onSuccess: () => {
      query.refetch();
      toast.success("Absence signalée.");
    },
    onError: (error) => toast.error(error.message),
  });
  if (query.isLoading)
    return (
      <div className="rounded-2xl border bg-card p-6">
        <LoaderCircle className="mx-auto size-6 animate-spin text-primary" />
      </div>
    );
  if (query.error || !query.data)
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        Le planning familial ne peut pas être chargé.{" "}
        <Button size="sm" variant="outline" className="ml-2" onClick={() => query.refetch()}>
          Réessayer
        </Button>
      </div>
    );
  const { learners, memberships, sessions, attendance, reports } = query.data;
  return (
    <section className="mt-10" aria-labelledby="family-schedule-title">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <CalendarDays className="size-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Cours en direct
          </p>
          <h2 id="family-schedule-title" className="font-serif text-2xl">
            Planning de mes enfants
          </h2>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {learners.map((learner) => {
          const cohortIds = memberships
            .filter((item) => item.learner_id === learner.id)
            .map((item) => item.cohort_id);
          const learnerSessions = sessions.filter(
            (session) => session.cohort_id && cohortIds.includes(session.cohort_id),
          );
          const upcoming = learnerSessions.find(
            (session) =>
              new Date(session.ends_at ?? session.starts_at) >= new Date() &&
              session.status !== "cancelled",
          );
          const missed = attendance.filter(
            (item) =>
              item.learner_id === learner.id &&
              ["excused_absence", "unexcused_absence"].includes(item.status),
          ).length;
          return (
            <Card key={learner.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {learner.preferred_name || learner.full_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {missed} cours manqué{missed > 1 ? "s" : ""}
                    </p>
                  </div>
                  {upcoming?.status === "rescheduled" && (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                      Reporté
                    </span>
                  )}
                </div>
                {upcoming ? (
                  <div className="mt-4 rounded-xl border p-4">
                    <p className="font-semibold">{upcoming.title}</p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock3 className="size-4" />{" "}
                      {localDate(upcoming.starts_at, upcoming.timezone)}
                    </p>
                    <p className="mt-1 text-sm font-medium text-primary">
                      {requirementLabels[upcoming.attendance_requirement]}
                    </p>
                    {upcoming.change_reason && (
                      <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                        {upcoming.change_reason}
                      </p>
                    )}
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {upcoming.join_url &&
                        new Date(upcoming.starts_at).getTime() - Date.now() <= 30 * 60_000 && (
                          <Button asChild className="min-h-11">
                            <a href={upcoming.join_url} target="_blank" rel="noreferrer">
                              <CirclePlay className="size-4" /> Rejoindre
                            </a>
                          </Button>
                        )}
                      <Button
                        variant="outline"
                        className="min-h-11"
                        disabled={
                          absenceMutation.isPending ||
                          reports.some(
                            (item) =>
                              item.live_session_id === upcoming.id &&
                              item.learner_id === learner.id,
                          )
                        }
                        onClick={() => {
                          const reason = window.prompt("Motif de l’absence (facultatif)") ?? "";
                          absenceMutation.mutate({
                            sessionId: upcoming.id,
                            learnerId: learner.id,
                            reason,
                          });
                        }}
                      >
                        {reports.some(
                          (item) =>
                            item.live_session_id === upcoming.id && item.learner_id === learner.id,
                        )
                          ? "Absence signalée"
                          : "Signaler l’absence"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    Aucun prochain cours programmé.
                  </p>
                )}
                <div className="mt-4 space-y-2">
                  {learnerSessions
                    .filter((session) => session.status === "completed" && session.replay_url)
                    .slice(-2)
                    .map((session) => (
                      <a
                        key={session.id}
                        href={session.replay_url!}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-11 items-center gap-2 rounded-xl bg-muted/60 px-3 text-sm font-medium hover:bg-muted"
                      >
                        <RotateCcw className="size-4" /> Replay · {session.title}
                      </a>
                    ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {!learners.length && (
        <div className="mt-4 rounded-2xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
          Aucun profil enfant n’est encore rattaché à ce compte parent.
        </div>
      )}
    </section>
  );
}
