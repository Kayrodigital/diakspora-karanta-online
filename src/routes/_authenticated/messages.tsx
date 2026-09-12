import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, CircleHelp, Headphones, MessageCircle, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createPedagogicalConversation,
  createSupportTicket,
  loadPedagogicalConversations,
  loadPedagogicalMessages,
  loadSupportMessages,
  loadSupportTickets,
  sendPedagogicalMessage,
  sendSupportMessage,
} from "@/features/communication/communication-data";
import { MessageThread } from "@/features/communication/MessageThread";
import { BottomNav } from "@/features/eleve/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { organizationTheme } from "@/lib/organization-theme";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages et aide — Diakspora Karanta" }] }),
  component: StudentMessagesPage,
});

async function loadMessagingSetup(organizationId: string, userId: string) {
  const learnerResult = await supabase
    .from("learner_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (learnerResult.error) throw learnerResult.error;
  const learner = learnerResult.data;
  if (!learner) return { learner: null, teachers: [] };
  const membershipsResult = await supabase
    .from("learner_cohort_memberships")
    .select("cohort_id")
    .eq("organization_id", organizationId)
    .eq("learner_id", learner.id)
    .eq("status", "active");
  if (membershipsResult.error) throw membershipsResult.error;
  const cohortIds = (membershipsResult.data ?? []).map((membership) => membership.cohort_id);
  if (!cohortIds.length) return { learner, teachers: [] };
  const cohortsResult = await supabase
    .from("cohorts")
    .select("id, name, teacher_id")
    .eq("organization_id", organizationId)
    .in("id", cohortIds);
  if (cohortsResult.error) throw cohortsResult.error;
  const teachers = [
    ...new Map(
      (cohortsResult.data ?? [])
        .filter((cohort) => cohort.teacher_id)
        .map((cohort) => [
          cohort.teacher_id!,
          { userId: cohort.teacher_id!, label: `Professeur · ${cohort.name}` },
        ]),
    ).values(),
  ];
  return { learner, teachers };
}

function ConversationList({
  items,
  selectedId,
  onSelect,
}: {
  items: Array<{ id: string; subject: string; status: string; last_message_at: string }>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (!items.length)
    return (
      <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Aucune discussion pour le moment.
      </p>
    );
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === item.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold">{item.subject}</p>
            <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[10px]">
              {item.status === "open" ? "Ouvert" : "Fermé"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(item.last_message_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })}
          </p>
        </button>
      ))}
    </div>
  );
}

function StudentMessagesPage() {
  const { organization, user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const setup = useQuery({
    queryKey: ["messaging-setup", organization.id, user.id],
    queryFn: () => loadMessagingSetup(organization.id, user.id),
  });
  const conversations = useQuery({
    queryKey: ["pedagogical-conversations", organization.id],
    queryFn: () => loadPedagogicalConversations(organization.id),
  });
  const tickets = useQuery({
    queryKey: ["support-tickets", organization.id],
    queryFn: () => loadSupportTickets(organization.id),
  });
  const conversationId = selectedConversationId || conversations.data?.[0]?.id || "";
  const ticketId = selectedTicketId || tickets.data?.[0]?.id || "";
  const messages = useQuery({
    queryKey: ["pedagogical-messages", organization.id, conversationId],
    queryFn: () => loadPedagogicalMessages(organization.id, conversationId),
    enabled: Boolean(conversationId),
  });
  const supportMessages = useQuery({
    queryKey: ["support-messages", organization.id, ticketId],
    queryFn: () => loadSupportMessages(organization.id, ticketId),
    enabled: Boolean(ticketId),
  });
  const selectedConversation = useMemo(
    () => conversations.data?.find((item) => item.id === conversationId),
    [conversations.data, conversationId],
  );
  const selectedTicket = useMemo(
    () => tickets.data?.find((item) => item.id === ticketId),
    [tickets.data, ticketId],
  );

  async function startConversation() {
    const learner = setup.data?.learner;
    const recipient = teacherId || setup.data?.teachers[0]?.userId;
    if (!learner || !recipient || subject.trim().length < 2 || !body.trim()) return;
    setCreating(true);
    setFormError(null);
    try {
      const created = await createPedagogicalConversation({
        organizationId: organization.id,
        learnerId: learner.id,
        teacherUserId: recipient,
        subject,
        body,
      });
      setSelectedConversationId(created.id);
      setSubject("");
      setBody("");
      setTeacherId("");
      await queryClient.invalidateQueries({
        queryKey: ["pedagogical-conversations", organization.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["pedagogical-messages", organization.id, created.id],
      });
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Impossible de créer la discussion.");
    } finally {
      setCreating(false);
    }
  }

  async function startTicket() {
    if (subject.trim().length < 2 || !body.trim()) return;
    setCreating(true);
    setFormError(null);
    try {
      const created = await createSupportTicket({
        organizationId: organization.id,
        subject,
        body,
        category: "technical",
      });
      setSelectedTicketId(created.id);
      setSubject("");
      setBody("");
      await queryClient.invalidateQueries({ queryKey: ["support-tickets", organization.id] });
      await queryClient.invalidateQueries({
        queryKey: ["support-messages", organization.id, created.id],
      });
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Impossible de créer la demande.");
    } finally {
      setCreating(false);
    }
  }

  function NewMessageForm({ support = false }: { support?: boolean }) {
    return (
      <Card className="border-primary/15 shadow-sm">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex items-center gap-2 font-semibold">
            <Plus className="size-4 text-primary" />{" "}
            {support ? "Nouvelle demande technique" : "Nouvelle question"}
          </div>
          {!support ? (
            <select
              value={teacherId}
              onChange={(event) => setTeacherId(event.target.value)}
              className="min-h-11 w-full rounded-xl border bg-background px-3 text-sm"
              aria-label="Professeur destinataire"
            >
              <option value="">Choisir mon professeur</option>
              {(setup.data?.teachers ?? []).map((teacher) => (
                <option key={teacher.userId} value={teacher.userId}>
                  {teacher.label}
                </option>
              ))}
            </select>
          ) : null}
          <Input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            maxLength={160}
            placeholder={support ? "Ex. Je n’arrive pas à lire un audio" : "Sujet de ma question"}
          />
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={4000}
            rows={4}
            placeholder="Expliquez votre demande…"
          />
          {formError ? (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}
          <Button
            type="button"
            onClick={support ? startTicket : startConversation}
            disabled={
              creating ||
              subject.trim().length < 2 ||
              !body.trim() ||
              (!support && !(teacherId || setup.data?.teachers[0]))
            }
            className="w-full rounded-xl"
          >
            {creating ? "Envoi…" : "Envoyer"}
          </Button>
          {!support && setup.data && !setup.data.teachers.length ? (
            <p className="text-xs text-amber-700">
              Aucun professeur n’est encore attribué à votre classe.
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--cream)]" style={organizationTheme(organization)}>
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6">
        <Link
          to="/eleve"
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          <ChevronLeft className="size-4" /> Retour
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <MessageCircle className="size-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--gold-dark)]">
              Échanges privés
            </p>
            <h1 className="font-serif text-2xl">Messages et aide</h1>
          </div>
        </div>

        <Tabs defaultValue="teacher" className="mt-6">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl p-1 sm:w-96">
            <TabsTrigger value="teacher" className="min-h-11 rounded-xl">
              <UserRound className="mr-2 size-4" /> Professeur
            </TabsTrigger>
            <TabsTrigger value="support" className="min-h-11 rounded-xl">
              <Headphones className="mr-2 size-4" /> Support
            </TabsTrigger>
          </TabsList>
          <TabsContent value="teacher" className="mt-5">
            <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
              <div className="space-y-4">
                <NewMessageForm />
                <ConversationList
                  items={conversations.data ?? []}
                  selectedId={conversationId}
                  onSelect={setSelectedConversationId}
                />
              </div>
              <Card className="border-border/60 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  {selectedConversation ? (
                    <>
                      <div className="mb-4 border-b pb-4">
                        <p className="text-xs text-muted-foreground">
                          Discussion avec le professeur
                        </p>
                        <h2 className="font-semibold">{selectedConversation.subject}</h2>
                      </div>
                      <MessageThread
                        messages={messages.data ?? []}
                        currentUserId={user.id}
                        onSend={async (message) => {
                          await sendPedagogicalMessage(
                            organization.id,
                            selectedConversation.id,
                            message,
                          );
                          await queryClient.invalidateQueries({
                            queryKey: [
                              "pedagogical-messages",
                              organization.id,
                              selectedConversation.id,
                            ],
                          });
                          await queryClient.invalidateQueries({
                            queryKey: ["pedagogical-conversations", organization.id],
                          });
                        }}
                      />
                    </>
                  ) : (
                    <div className="grid min-h-[28rem] place-items-center text-center">
                      <div>
                        <CircleHelp className="mx-auto size-9 text-muted-foreground" />
                        <p className="mt-3 text-sm text-muted-foreground">
                          Choisissez une discussion ou posez une nouvelle question.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="support" className="mt-5">
            <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
              <div className="space-y-4">
                <NewMessageForm support />
                <ConversationList
                  items={tickets.data ?? []}
                  selectedId={ticketId}
                  onSelect={setSelectedTicketId}
                />
              </div>
              <Card className="border-border/60 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  {selectedTicket ? (
                    <>
                      <div className="mb-4 border-b pb-4">
                        <p className="text-xs text-muted-foreground">
                          Support technique · {selectedTicket.status}
                        </p>
                        <h2 className="font-semibold">{selectedTicket.subject}</h2>
                      </div>
                      <MessageThread
                        messages={supportMessages.data ?? []}
                        currentUserId={user.id}
                        onSend={async (message) => {
                          await sendSupportMessage(organization.id, selectedTicket.id, message);
                          await queryClient.invalidateQueries({
                            queryKey: ["support-messages", organization.id, selectedTicket.id],
                          });
                          await queryClient.invalidateQueries({
                            queryKey: ["support-tickets", organization.id],
                          });
                        }}
                      />
                    </>
                  ) : (
                    <div className="grid min-h-[28rem] place-items-center text-center">
                      <div>
                        <Headphones className="mx-auto size-9 text-muted-foreground" />
                        <p className="mt-3 text-sm text-muted-foreground">
                          Créez une demande si vous avez un problème technique.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav active="messages" />
    </div>
  );
}
