import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Headphones, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  loadSupportMessages,
  loadSupportTickets,
  sendSupportMessage,
  updateSupportTicket,
} from "@/features/communication/communication-data";
import { MessageThread } from "@/features/communication/MessageThread";

export function AdminSupport({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tickets = useQuery({
    queryKey: ["support-tickets", organizationId],
    queryFn: () => loadSupportTickets(organizationId),
  });
  const ticketId = selectedId || tickets.data?.[0]?.id || "";
  const selected = tickets.data?.find((ticket) => ticket.id === ticketId);
  const messages = useQuery({
    queryKey: ["support-messages", organizationId, ticketId],
    queryFn: () => loadSupportMessages(organizationId, ticketId),
    enabled: Boolean(ticketId),
  });

  async function setStatus(status: "in_progress" | "resolved") {
    if (!selected) return;
    setUpdating(true);
    setError(null);
    try {
      await updateSupportTicket(selected.id, { status, assignedTo: userId });
      await queryClient.invalidateQueries({ queryKey: ["support-tickets", organizationId] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "La demande n’a pas pu être mise à jour.");
    } finally {
      setUpdating(false);
    }
  }

  if (!tickets.data?.length && !tickets.isLoading) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center">
        <Headphones className="mx-auto size-9 text-muted-foreground" />
        <h2 className="mt-3 font-semibold">Aucune demande de support</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Les demandes techniques des utilisateurs apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[21rem_minmax(0,1fr)]">
      <div className="space-y-2">
        {(tickets.data ?? []).map((ticket) => (
          <button
            key={ticket.id}
            type="button"
            onClick={() => setSelectedId(ticket.id)}
            className={`w-full rounded-2xl border p-4 text-left ${ticketId === ticket.id ? "border-primary bg-primary/5" : "border-border bg-card"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="line-clamp-2 font-semibold">{ticket.subject}</p>
              <Badge variant={ticket.status === "resolved" ? "secondary" : "outline"}>
                {ticket.status === "resolved"
                  ? "Résolu"
                  : ticket.status === "in_progress"
                    ? "En cours"
                    : "Ouvert"}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {ticket.category} · {new Date(ticket.last_message_at).toLocaleDateString("fr-FR")}
            </p>
          </button>
        ))}
      </div>
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          {selected ? (
            <>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Support technique
                  </p>
                  <h2 className="font-semibold">{selected.subject}</h2>
                </div>
                <div className="flex gap-2">
                  {selected.status === "open" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updating}
                      onClick={() => setStatus("in_progress")}
                    >
                      {updating ? <Loader2 className="size-4 animate-spin" /> : null} Prendre en
                      charge
                    </Button>
                  ) : null}
                  {selected.status !== "resolved" ? (
                    <Button size="sm" disabled={updating} onClick={() => setStatus("resolved")}>
                      <CheckCircle2 className="size-4" /> Résoudre
                    </Button>
                  ) : null}
                </div>
              </div>
              {error ? (
                <p role="alert" className="mb-3 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <MessageThread
                messages={messages.data ?? []}
                currentUserId={userId}
                onSend={async (body) => {
                  await sendSupportMessage(organizationId, selected.id, body);
                  await queryClient.invalidateQueries({
                    queryKey: ["support-messages", organizationId, selected.id],
                  });
                  await queryClient.invalidateQueries({
                    queryKey: ["support-tickets", organizationId],
                  });
                }}
              />
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
