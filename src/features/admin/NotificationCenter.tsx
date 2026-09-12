import { useQuery } from "@tanstack/react-query";
import { Bell, CheckCircle2, Clock3, MailWarning, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

type Props = { organizationId: string };

const kindLabels: Record<string, string> = {
  invitation: "Invitation au direct",
  updated: "Direct modifié",
  cancelled: "Direct annulé",
  reminder_24h: "Rappel 24 h",
  reminder_1h: "Rappel 1 h",
  replay: "Replay disponible",
};

const statusLabels: Record<string, string> = {
  queued: "En attente",
  sending: "Envoi en cours",
  sent: "Envoyé",
  failed: "À réessayer",
  skipped: "Ignoré",
};

async function loadNotifications(organizationId: string) {
  const { data, error } = await supabase
    .from("live_session_email_deliveries")
    .select(
      "id, recipient_email, recipient_name, kind, status, attempts, scheduled_for, sent_at, last_error, live_sessions(title, starts_at)",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

function dateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NotificationCenter({ organizationId }: Props) {
  const query = useQuery({
    queryKey: ["admin-live-notifications", organizationId],
    queryFn: () => loadNotifications(organizationId),
    refetchInterval: 60_000,
  });
  const notifications = query.data ?? [];
  const sent = notifications.filter((item) => item.status === "sent").length;
  const pending = notifications.filter((item) =>
    ["queued", "sending"].includes(item.status),
  ).length;
  const failed = notifications.filter((item) => item.status === "failed").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Notifications des directs</h2>
          <p className="text-sm text-muted-foreground">
            Invitations, changements, rappels 24 h et 1 h, annulations et replays envoyés par Brevo.
          </p>
        </div>
        <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
          <RefreshCw className={`size-4 ${query.isFetching ? "animate-spin" : ""}`} /> Actualiser
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Envoyées", value: sent, icon: <CheckCircle2 className="size-5" /> },
          { label: "En attente", value: pending, icon: <Clock3 className="size-5" /> },
          { label: "À réessayer", value: failed, icon: <MailWarning className="size-5" /> },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/70 shadow-sm">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-3xl font-semibold">{stat.value}</p>
              </div>
              <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                {stat.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          {query.isLoading && (
            <div className="space-y-3 p-5">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          )}
          {query.isError && <p className="p-5 text-sm text-destructive">{query.error.message}</p>}
          {!query.isLoading && !query.isError && notifications.length === 0 && (
            <div className="px-5 py-12 text-center">
              <Bell className="mx-auto size-9 text-primary" />
              <h3 className="mt-3 font-semibold">Aucun envoi pour le moment</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Les prochains directs alimenteront automatiquement ce journal.
              </p>
            </div>
          )}
          <div className="divide-y divide-border">
            {notifications.map((item) => {
              const session = Array.isArray(item.live_sessions)
                ? item.live_sessions[0]
                : item.live_sessions;
              return (
                <div
                  key={item.id}
                  className="grid gap-3 p-4 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{session?.title ?? "Cours en direct"}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {item.recipient_name || item.recipient_email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{kindLabels[item.kind] ?? item.kind}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.sent_at
                        ? `Envoyé le ${dateTime(item.sent_at)}`
                        : `Prévu le ${dateTime(item.scheduled_for)}`}
                    </p>
                    {item.last_error && (
                      <p className="mt-1 line-clamp-2 text-xs text-destructive">
                        {item.last_error}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      item.status === "sent"
                        ? "secondary"
                        : item.status === "failed"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {statusLabels[item.status] ?? item.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
