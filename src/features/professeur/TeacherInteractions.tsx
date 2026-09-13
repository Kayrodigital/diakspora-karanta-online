import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Mic,
  RotateCcw,
  Send,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createPedagogicalConversation,
  loadPedagogicalConversations,
  loadPedagogicalMessages,
  sendPedagogicalMessage,
} from "@/features/communication/communication-data";
import { MessageThread } from "@/features/communication/MessageThread";
import { reviewHomeworkSubmission, type TeacherDashboardData } from "./teacher-data";

export function HomeworkReviewPanel({
  organizationId,
  userId,
  data,
}: {
  organizationId: string;
  userId: string;
  data: TeacherDashboardData;
}) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(data.homework[0]?.id ?? "");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = data.homework.find((item) => item.id === selectedId) ?? data.homework[0];

  async function save(status: "graded" | "resubmit_requested") {
    if (!selected || !feedback.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await reviewHomeworkSubmission({
        submissionId: selected.id,
        feedback,
        status,
        reviewerUserId: userId,
      });
      setFeedback("");
      await queryClient.invalidateQueries({
        queryKey: ["teacher-dashboard", organizationId, userId],
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "La correction n’a pas pu être enregistrée.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!data.homework.length)
    return (
      <div className="rounded-3xl border border-dashed p-10 text-center">
        <Mic className="mx-auto size-9 text-muted-foreground" />
        <h2 className="mt-3 font-semibold">Aucun devoir reçu</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Les enregistrements de vos élèves apparaîtront ici.
        </p>
      </div>
    );

  return (
    <div className="grid gap-5 lg:grid-cols-[21rem_minmax(0,1fr)]">
      <div className="space-y-2">
        {data.homework.map((submission) => (
          <button
            key={submission.id}
            type="button"
            onClick={() => {
              setSelectedId(submission.id);
              setFeedback(submission.feedback_text ?? "");
            }}
            className={`w-full rounded-2xl border p-4 text-left ${selected?.id === submission.id ? "border-primary bg-primary/5" : "border-border bg-card"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">{submission.learnerName}</p>
                <p className="truncate text-xs text-muted-foreground">{submission.lessonTitle}</p>
              </div>
              <Badge variant={submission.status === "graded" ? "secondary" : "outline"}>
                {submission.status === "graded" ? "Corrigé" : "À écouter"}
              </Badge>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {new Date(submission.created_at).toLocaleString("fr-FR", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </button>
        ))}
      </div>
      {selected ? (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Correction de {selected.learnerName}
                </p>
                <h2 className="mt-1 font-serif text-xl">{selected.lessonTitle}</h2>
              </div>
              {selected.duration_seconds ? (
                <Badge variant="outline">{Math.ceil(selected.duration_seconds / 60)} min</Badge>
              ) : null}
            </div>
            {selected.notes ? (
              <div className="mt-4 rounded-2xl bg-muted/60 p-4 text-sm">
                <p className="font-semibold">Message de l’élève</p>
                <p className="mt-1 leading-6 text-muted-foreground">{selected.notes}</p>
              </div>
            ) : null}
            {selected.signedUrl && selected.type === "audio" ? (
              <audio
                key={selected.id}
                controls
                preload="metadata"
                src={selected.signedUrl}
                className="mt-5 w-full"
                aria-label={`Écouter le devoir de ${selected.learnerName}`}
              />
            ) : selected.signedUrl ? (
              <Button asChild variant="outline" className="mt-5 w-full">
                <a href={selected.signedUrl} target="_blank" rel="noreferrer">
                  Voir le devoir
                </a>
              </Button>
            ) : selected.external_url ? (
              <Button asChild variant="outline" className="mt-5 w-full">
                <a href={selected.external_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" /> Ouvrir le document Google
                </a>
              </Button>
            ) : (
              <p className="mt-5 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                Le fichier n’est pas disponible.
              </p>
            )}
            <label htmlFor="teacher-feedback" className="mt-6 block text-sm font-semibold">
              Votre retour pédagogique
            </label>
            <Textarea
              id="teacher-feedback"
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              rows={5}
              maxLength={4000}
              placeholder="Points réussis, correction et conseil pour progresser…"
              className="mt-2 resize-none"
            />
            {error ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving || !feedback.trim()}
                onClick={() => save("resubmit_requested")}
                className="rounded-xl"
              >
                <RotateCcw className="size-4" /> Demander de refaire
              </Button>
              <Button
                type="button"
                disabled={saving || !feedback.trim()}
                onClick={() => save("graded")}
                className="rounded-xl"
              >
                <CheckCircle2 className="size-4" />{" "}
                {saving ? "Enregistrement…" : "Valider la correction"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function TeacherMessagesPanel({
  organizationId,
  userId,
  data,
}: {
  organizationId: string;
  userId: string;
  data: TeacherDashboardData;
}) {
  const queryClient = useQueryClient();
  const learners = useMemo(
    () => [
      ...new Map(
        data.cohorts.flatMap((cohort) => cohort.learners).map((learner) => [learner.id, learner]),
      ).values(),
    ],
    [data.cohorts],
  );
  const learnerNames = useMemo(
    () =>
      new Map(learners.map((learner) => [learner.id, learner.preferredName || learner.fullName])),
    [learners],
  );
  const [selectedId, setSelectedId] = useState("");
  const [learnerId, setLearnerId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversations = useQuery({
    queryKey: ["pedagogical-conversations", organizationId],
    queryFn: () => loadPedagogicalConversations(organizationId),
  });
  const conversationId = selectedId || conversations.data?.[0]?.id || "";
  const selected = conversations.data?.find((conversation) => conversation.id === conversationId);
  const messages = useQuery({
    queryKey: ["pedagogical-messages", organizationId, conversationId],
    queryFn: () => loadPedagogicalMessages(organizationId, conversationId),
    enabled: Boolean(conversationId),
  });

  async function startConversation() {
    if (!learnerId || subject.trim().length < 2 || !body.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createPedagogicalConversation({
        organizationId,
        learnerId,
        teacherUserId: userId,
        subject,
        body,
      });
      setSelectedId(created.id);
      setLearnerId("");
      setSubject("");
      setBody("");
      await queryClient.invalidateQueries({
        queryKey: ["pedagogical-conversations", organizationId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["pedagogical-messages", organizationId, created.id],
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de créer la discussion.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[21rem_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card className="border-primary/15">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2 font-semibold">
              <Send className="size-4 text-primary" /> Nouveau message
            </div>
            <select
              value={learnerId}
              onChange={(event) => setLearnerId(event.target.value)}
              className="min-h-11 w-full rounded-xl border bg-background px-3 text-sm"
            >
              <option value="">Choisir un élève</option>
              {learners
                .filter((learner) => learner.userId)
                .map((learner) => (
                  <option key={learner.id} value={learner.id}>
                    {learner.preferredName || learner.fullName}
                  </option>
                ))}
            </select>
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={160}
              placeholder="Sujet"
            />
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={4000}
              rows={3}
              placeholder="Votre message…"
            />
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button
              type="button"
              onClick={startConversation}
              disabled={creating || !learnerId || subject.trim().length < 2 || !body.trim()}
              className="w-full rounded-xl"
            >
              {creating ? "Envoi…" : "Envoyer"}
            </Button>
          </CardContent>
        </Card>
        <div className="space-y-2">
          {(conversations.data ?? []).map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => setSelectedId(conversation.id)}
              className={`w-full rounded-2xl border p-4 text-left ${conversationId === conversation.id ? "border-primary bg-primary/5" : "border-border bg-card"}`}
            >
              <div className="flex items-center gap-2">
                <UserRound className="size-4 text-primary" />
                <p className="truncate font-semibold">
                  {learnerNames.get(conversation.learner_id) || "Élève"}
                </p>
              </div>
              <p className="mt-1 truncate text-sm">{conversation.subject}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {new Date(conversation.last_message_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </button>
          ))}
        </div>
      </div>
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          {selected ? (
            <>
              <div className="mb-4 border-b pb-4">
                <p className="text-xs text-muted-foreground">
                  {learnerNames.get(selected.learner_id) || "Élève"}
                </p>
                <h2 className="font-semibold">{selected.subject}</h2>
              </div>
              <MessageThread
                messages={messages.data ?? []}
                currentUserId={userId}
                onSend={async (message) => {
                  await sendPedagogicalMessage(organizationId, selected.id, message);
                  await queryClient.invalidateQueries({
                    queryKey: ["pedagogical-messages", organizationId, selected.id],
                  });
                  await queryClient.invalidateQueries({
                    queryKey: ["pedagogical-conversations", organizationId],
                  });
                }}
              />
            </>
          ) : (
            <div className="grid min-h-[28rem] place-items-center text-center">
              <div>
                <MessageCircle className="mx-auto size-9 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Sélectionnez une discussion ou écrivez à un élève.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
