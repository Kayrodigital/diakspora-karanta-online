import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarPlus,
  ChevronLeft,
  CirclePlay,
  Clock3,
  Radio,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/features/eleve/BottomNav";
import { loadStudentLiveHub, type StudentLiveSessionView } from "@/features/eleve/student-data";
import { liveProviderLabels } from "@/features/live/live-data";
import { organizationTheme } from "@/lib/organization-theme";

export const Route = createFileRoute("/_authenticated/directs")({
  head: () => ({ meta: [{ title: "Mes directs — Diakspora Karanta" }] }),
  component: StudentLivesPage,
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

function calendarUrl(session: StudentLiveSessionView) {
  const compact = (value: string) =>
    new Date(value).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const end =
    session.ends_at ?? new Date(new Date(session.starts_at).getTime() + 60 * 60_000).toISOString();
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: session.title,
    dates: `${compact(session.starts_at)}/${compact(end)}`,
    details: [session.description, session.join_url].filter(Boolean).join("\n\n"),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function audienceLabel(session: StudentLiveSessionView) {
  return session.cohortName || session.courseTitle || "École Diakspora";
}

function UpcomingCard({ session }: { session: StudentLiveSessionView }) {
  const isLive = session.status === "live";
  return (
    <Card
      className={
        isLive
          ? "overflow-hidden border-red-300 bg-red-50/40 shadow-sm"
          : "overflow-hidden border-border/70 shadow-sm"
      }
    >
      <CardContent className="p-0">
        <div className="flex gap-4 p-5">
          <div
            className={`grid size-12 shrink-0 place-items-center rounded-2xl ${isLive ? "bg-red-600 text-white" : "bg-primary/10 text-primary"}`}
          >
            {isLive ? <Radio className="size-5" /> : <Video className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-serif text-lg font-semibold leading-tight">{session.title}</p>
              {isLive ? <Badge className="bg-red-600 hover:bg-red-600">En direct</Badge> : null}
            </div>
            <p className="mt-2 text-sm font-medium capitalize">
              {dateFormatter.format(new Date(session.starts_at))}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {liveProviderLabels[session.provider] ?? session.provider} · {audienceLabel(session)}
            </p>
            {session.description ? (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{session.description}</p>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t bg-card/70 p-4">
          <Button asChild variant="outline" className="min-h-11 rounded-xl">
            <a href={calendarUrl(session)} target="_blank" rel="noreferrer">
              <CalendarPlus aria-hidden /> Calendrier
            </a>
          </Button>
          {session.join_url ? (
            <Button asChild className="min-h-11 rounded-xl">
              <a href={session.join_url} target="_blank" rel="noreferrer">
                {isLive ? "Rejoindre" : "Ouvrir le lien"} <ArrowUpRight aria-hidden />
              </a>
            </Button>
          ) : (
            <Button disabled className="min-h-11 rounded-xl">
              Lien à venir
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ReplayCard({ session }: { session: StudentLiveSessionView }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[color:var(--gold)]/20 text-[color:var(--gold-dark)]">
            <CirclePlay className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">{session.title}</p>
            <p className="mt-1 text-xs capitalize text-muted-foreground">
              {dateFormatter.format(new Date(session.starts_at))} · {audienceLabel(session)}
            </p>
          </div>
        </div>
        <Button asChild variant="secondary" className="mt-4 min-h-11 w-full rounded-xl">
          <a href={session.replay_url!} target="_blank" rel="noreferrer">
            <CirclePlay aria-hidden /> Regarder le replay
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function StudentLivesPage() {
  const { organization } = Route.useRouteContext();
  const hub = useQuery({
    queryKey: ["student-live-hub", organization.id],
    queryFn: () => loadStudentLiveHub(organization.id),
  });

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.12),transparent_25rem)] bg-background pb-28 text-foreground"
      style={organizationTheme(organization)}
    >
      <header className="border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
          <Link
            to="/eleve"
            className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-primary"
          >
            <ChevronLeft className="size-4" /> Retour
          </Link>
          <div className="mt-4 flex items-start gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600">
              <Radio className="size-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">
                Classes en ligne
              </p>
              <h1 className="mt-1 font-serif text-3xl font-semibold">Mes directs</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Les rendez-vous, liens de participation et replays de tes classes.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-9 px-4 py-6 sm:px-6">
        {hub.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        ) : null}
        {hub.isError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <p className="font-semibold">Impossible de charger les directs</p>
            <p className="mt-1 text-sm text-muted-foreground">{hub.error.message}</p>
            <Button variant="outline" className="mt-4" onClick={() => hub.refetch()}>
              Réessayer
            </Button>
          </div>
        ) : null}
        {hub.data ? (
          <>
            <section>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    À venir
                  </p>
                  <h2 className="mt-1 font-serif text-2xl font-semibold">Prochains rendez-vous</h2>
                </div>
                <Badge variant="secondary">{hub.data.upcoming.length}</Badge>
              </div>
              {hub.data.upcoming.length ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {hub.data.upcoming.map((session) => (
                    <UpcomingCard key={session.id} session={session} />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed bg-card p-8 text-center">
                  <Clock3 className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 font-semibold">Aucun direct programmé</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Les nouveaux rendez-vous publiés par ton professeur apparaîtront ici.
                  </p>
                </div>
              )}
            </section>

            <section>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--gold-dark)]">
                    Archives
                  </p>
                  <h2 className="mt-1 font-serif text-2xl font-semibold">Replays disponibles</h2>
                </div>
                <Badge variant="outline">{hub.data.replays.length}</Badge>
              </div>
              {hub.data.replays.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {hub.data.replays.map((session) => (
                    <ReplayCard key={session.id} session={session} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-card p-5 text-sm text-muted-foreground">
                  Aucun replay n’est encore disponible.
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
      <BottomNav active="live" />
    </div>
  );
}
