import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Headphones,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  Mic,
  NotebookPen,
  PlayCircle,
  RotateCcw,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/features/learning/LearningUi";
import { ProgressBadge } from "@/features/learning/ProgressUi";
import {
  loadSessionExperience,
  saveSessionLessonNote,
  saveSelfCorrection,
  type SessionActivity,
  type SessionResource,
} from "@/features/learning/session-experience";
import {
  completeSessionProgress,
  startSessionProgress,
  type SessionProgressStatus,
} from "@/features/learning/progress-data";

function youtubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const id =
      host === "youtu.be"
        ? parsed.pathname.split("/").filter(Boolean)[0]
        : (parsed.searchParams.get("v") ??
          (parsed.pathname.startsWith("/embed/") ? parsed.pathname.split("/")[2] : null));
    return id && /^[a-zA-Z0-9_-]{6,}$/.test(id)
      ? `https://www.youtube-nocookie.com/embed/${id}`
      : null;
  } catch {
    return null;
  }
}

function ResourceCard({
  resource,
  featured = false,
}: {
  resource: SessionResource;
  featured?: boolean;
}) {
  const youtube =
    resource.resource_type === "youtube" ? youtubeEmbedUrl(resource.playbackUrl) : null;
  const isAudio = resource.resource_type === "audio";
  const isVideo = resource.resource_type === "video";
  const isText = resource.resource_type === "text";
  const Icon = isAudio ? Headphones : isVideo || youtube ? PlayCircle : FileText;
  return (
    <article
      className={
        featured
          ? "overflow-hidden rounded-[14px] border border-[var(--learning-border)] bg-[var(--learning-paper)]"
          : "overflow-hidden rounded-3xl border border-[#E4D8C3] bg-white p-4 shadow-sm sm:p-6"
      }
    >
      <div className={featured ? "flex items-start gap-3 px-4 py-3" : "flex items-start gap-3"}>
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#F7E9C8] text-[#7D5A20]">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold text-[#173F2B]">{resource.title}</h3>
          {!featured && resource.description ? (
            <p className="mt-1 text-sm leading-6 text-[#686D65]">{resource.description}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#686D65]">
            {resource.author_name ? <span>Par {resource.author_name}</span> : null}
            {!featured && resource.source_name ? <span>• {resource.source_name}</span> : null}
            {resource.access_tier ? (
              <span className="rounded-full bg-[#EEF4EF] px-2 py-1 font-semibold uppercase">
                {resource.access_tier === "free" ? "Gratuit" : "Premium"}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {isAudio && resource.playbackUrl ? (
        <audio controls preload="metadata" className="mt-4 w-full" src={resource.playbackUrl}>
          Votre navigateur ne peut pas lire cet audio.
        </audio>
      ) : null}
      {isVideo && resource.playbackUrl ? (
        <video
          controls
          preload="metadata"
          className={
            featured
              ? "aspect-video w-full bg-black"
              : "mt-4 aspect-video w-full rounded-2xl bg-black"
          }
          src={resource.playbackUrl}
        >
          Votre navigateur ne peut pas lire cette vidéo.
        </video>
      ) : null}
      {youtube ? (
        <iframe
          src={youtube}
          title={resource.title}
          className={
            featured
              ? "aspect-video w-full bg-black"
              : "mt-4 aspect-video w-full rounded-2xl bg-black"
          }
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : null}
      {isText && resource.transcript ? (
        <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-[#FAF7EF] p-4 text-sm leading-7 text-[#30342F]">
          {resource.transcript}
        </div>
      ) : null}
      {!isText && resource.transcript ? (
        <details className="mt-4 rounded-2xl bg-[#FAF7EF] p-4 text-sm">
          <summary className="cursor-pointer font-semibold text-[#173F2B]">
            Lire la transcription
          </summary>
          <p className="mt-3 whitespace-pre-wrap leading-7">{resource.transcript}</p>
        </details>
      ) : null}
      {!isAudio && !isVideo && !youtube && !isText && resource.playbackUrl ? (
        <a
          href={resource.playbackUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#173F2B] px-4 font-semibold text-[#173F2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973F]"
        >
          {resource.allow_download ? (
            <Download className="size-4" />
          ) : (
            <ExternalLink className="size-4" />
          )}
          {resource.allow_download ? "Télécharger" : "Ouvrir la ressource"}
        </a>
      ) : null}
    </article>
  );
}

function ActivityCard({
  activity,
  lessonId,
  profileId,
  userId,
  pending,
  onEvaluate,
}: {
  activity: SessionActivity;
  lessonId: string;
  profileId: string | null;
  userId: string | null;
  pending: boolean;
  onEvaluate: (activity: SessionActivity, evaluation: "understood" | "review" | null) => void;
}) {
  const completed = activity.attempt?.status === "completed";
  return (
    <article className="rounded-3xl border border-[#D7E2D9] bg-[#F8FBF8] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#173F2B] text-white">
          {activity.activity_type === "quiz" ? (
            <ListChecks className="size-5" />
          ) : (
            <Sparkles className="size-5" />
          )}
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B815F]">
            {activity.activity_type === "quiz" ? "Quiz" : "Activité"}
          </p>
          <h3 className="mt-1 font-serif text-2xl font-semibold text-[#173F2B]">
            {activity.title}
          </h3>
          {activity.instructions ? (
            <p className="mt-2 text-sm leading-6 text-[#58605A]">{activity.instructions}</p>
          ) : null}
        </div>
      </div>
      {activity.activity_type === "quiz" && activity.quizId ? (
        profileId ? (
          <Button asChild className="mt-5 min-h-12 w-full rounded-xl sm:w-auto">
            <Link to="/lecon" search={{ id: lessonId }}>
              Commencer le quiz
            </Link>
          </Button>
        ) : (
          <p className="mt-5 flex items-center gap-2 rounded-xl bg-white p-4 text-sm text-[#58605A]">
            <LockKeyhole className="size-4" /> Connectez-vous pour répondre au quiz.
          </p>
        )
      ) : null}
      {activity.correction_mode === "self_correction" ? (
        profileId && userId ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              disabled={pending}
              onClick={() => onEvaluate(activity, "understood")}
              className="min-h-12 rounded-xl"
            >
              {pending ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}
              J’ai compris
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onEvaluate(activity, "review")}
              className="min-h-12 rounded-xl"
            >
              <RotateCcw /> À revoir
            </Button>
            {completed ? (
              <Button
                type="button"
                variant="ghost"
                className="sm:col-span-2"
                onClick={() => onEvaluate(activity, null)}
              >
                Recommencer l’activité
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="mt-5 text-sm text-[#58605A]">
            Connectez-vous pour enregistrer votre auto-correction.
          </p>
        )
      ) : null}
      {activity.activity_type === "submission" ? (
        <Button asChild variant="outline" className="mt-5 min-h-12 w-full rounded-xl sm:w-auto">
          <Link to="/devoir">
            <Mic /> Déposer mon devoir
          </Link>
        </Button>
      ) : null}
    </article>
  );
}

function PersonalNotes({
  initialBody,
  lessonId,
  organizationId,
  userId,
}: {
  initialBody: string;
  lessonId: string;
  organizationId: string;
  userId: string | null;
}) {
  const [body, setBody] = useState(initialBody);
  const [savedBody, setSavedBody] = useState(initialBody);
  const mutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("Connectez-vous pour enregistrer une note.");
      return saveSessionLessonNote({ organizationId, userId, lessonId, body });
    },
    onSuccess: () => {
      setSavedBody(body);
      toast.success("Note personnelle enregistrée.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible."),
  });

  return (
    <details className="rounded-[14px] border border-[var(--learning-border)] bg-[var(--learning-paper)] px-4 py-3">
      <summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 font-bold text-[var(--learning-green)] marker:hidden">
        <NotebookPen className="size-4" aria-hidden="true" /> Mes notes personnelles
      </summary>
      {userId ? (
        <div className="mt-3">
          <label htmlFor="personal-lesson-note" className="sr-only">
            Mes notes personnelles pour cette leçon
          </label>
          <textarea
            id="personal-lesson-note"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={5}
            maxLength={10000}
            placeholder="Écrivez ici ce que vous souhaitez retenir…"
            className="w-full resize-y rounded-xl border border-[var(--learning-border)] bg-white px-3 py-3 text-sm leading-6 text-[var(--learning-ink)] outline-none focus:border-[var(--learning-green)] focus:ring-2 focus:ring-[var(--learning-green)]/15"
          />
          <Button
            type="button"
            size="sm"
            disabled={mutation.isPending || body === savedBody}
            onClick={() => mutation.mutate()}
            className="mt-3 min-h-10 rounded-xl bg-[var(--learning-green)] px-4 text-white"
          >
            <Save className="size-4" aria-hidden="true" /> Enregistrer ma note
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-[var(--learning-muted)]">
          <Link to="/auth" search={{ portal: "family" }} className="font-bold underline">
            Connectez-vous
          </Link>{" "}
          pour retrouver vos notes sur tous vos appareils.
        </p>
      )}
    </details>
  );
}

export function SessionExperience({
  sessionId,
  lessonId,
  organizationId,
  requiresValidation,
  learningPoints,
  reflectionQuestions,
  variant = "default",
}: {
  sessionId: string;
  lessonId: string;
  organizationId: string;
  requiresValidation: boolean;
  learningPoints: string[];
  reflectionQuestions: string[];
  variant?: "default" | "heritage";
}) {
  const queryClient = useQueryClient();
  const queryKey = ["session-experience", sessionId, lessonId] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => loadSessionExperience(sessionId, lessonId, organizationId),
  });
  const mutation = useMutation({
    mutationFn: ({
      activity,
      evaluation,
    }: {
      activity: SessionActivity;
      evaluation: "understood" | "review" | null;
    }) => {
      if (!query.data?.activeProfileId || !query.data.userId) throw new Error("Connexion requise.");
      return saveSelfCorrection({
        activity,
        profileId: query.data.activeProfileId,
        userId: query.data.userId,
        evaluation,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      toast.success("Progression enregistrée.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible."),
  });
  const progressMutation = useMutation({
    mutationFn: async (action: "start" | "complete") => {
      const data = query.data;
      if (!data?.activeProfileId)
        throw new Error("Connectez-vous pour enregistrer votre progression.");
      if (action === "start") {
        await startSessionProgress({ organizationId, profileId: data.activeProfileId, sessionId });
        return;
      }
      if (!data.progress) throw new Error("Commencez d’abord cette séance.");
      await completeSessionProgress(data.progress.id);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ["learning-catalog"] }),
      ]);
      toast.success("Progression de la séance enregistrée.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Progression impossible."),
  });

  if (query.isPending) return <div className="mt-8 h-40 animate-pulse rounded-3xl bg-[#F3EEE3]" />;
  if (query.isError)
    return (
      <EmptyState
        title="Contenu indisponible"
        description="Rechargez la page dans quelques instants."
      />
    );
  if (!query.data.enabled)
    return (
      <EmptyState
        title="Contenu en préparation"
        description="La nouvelle expérience de séance sera disponible après validation éditoriale."
      />
    );

  const progressStatus: SessionProgressStatus = query.data.progress?.status ?? "not_started";
  const featuredResource = query.data.resources.find((resource) =>
    ["youtube", "video", "audio"].includes(resource.resource_type),
  );
  const supportingResources = query.data.resources.filter(
    (resource) => resource.id !== featuredResource?.id,
  );

  if (variant === "heritage") {
    return (
      <div className="mt-5 space-y-5">
        {featuredResource ? (
          <section aria-label="Cours principal">
            <ResourceCard resource={featuredResource} featured />
          </section>
        ) : null}

        {query.data.progressEnabled ? (
          <section
            className="rounded-[14px] border border-[var(--learning-border)] bg-[var(--learning-paper)] p-4"
            aria-labelledby="session-progress-title"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2
                  id="session-progress-title"
                  className="text-sm font-extrabold text-[var(--learning-green)]"
                >
                  Ma progression
                </h2>
                <div className="mt-2">
                  <ProgressBadge status={progressStatus} />
                </div>
              </div>
              {!query.data.activeProfileId ? (
                <Button asChild variant="outline" size="sm" className="min-h-10 rounded-xl">
                  <Link to="/auth" search={{ portal: "family" }}>
                    Se connecter
                  </Link>
                </Button>
              ) : progressStatus === "not_started" ? (
                <Button
                  size="sm"
                  className="min-h-10 rounded-xl bg-[var(--learning-green)]"
                  disabled={progressMutation.isPending}
                  onClick={() => progressMutation.mutate("start")}
                >
                  Commencer
                </Button>
              ) : progressStatus === "in_progress" ? (
                <Button
                  size="sm"
                  className="min-h-10 rounded-xl bg-[var(--learning-green)]"
                  disabled={progressMutation.isPending}
                  onClick={() => progressMutation.mutate("complete")}
                >
                  Marquer comme terminé
                </Button>
              ) : progressStatus === "completed" && requiresValidation ? (
                <span className="text-right text-xs font-bold text-[var(--learning-muted)]">
                  Terminé · validation en attente
                </span>
              ) : (
                <span className="text-right text-xs font-bold text-[var(--learning-muted)]">
                  {progressStatus === "validated" ? "Validé" : "Terminé"}
                </span>
              )}
            </div>
          </section>
        ) : null}

        {learningPoints.length ? (
          <section
            className="rounded-[14px] bg-[var(--learning-active)] p-4"
            aria-labelledby="learning-points-title"
          >
            <h2
              id="learning-points-title"
              className="text-sm font-extrabold text-[var(--learning-green)]"
            >
              À retenir
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--learning-ink)]">
              {learningPoints.map((point, index) => (
                <li key={`${index}-${point}`} className="flex gap-3">
                  <span className="text-[var(--learning-gold-text)]" aria-hidden="true">
                    •
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {reflectionQuestions.length ? (
          <section
            className="rounded-[14px] bg-[var(--learning-sand)] p-4"
            aria-labelledby="reflection-title"
          >
            <h2
              id="reflection-title"
              className="text-sm font-extrabold text-[var(--learning-green)]"
            >
              Questions à se poser
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-[var(--learning-ink)]">
              {reflectionQuestions.map((question, index) => (
                <li key={`${index}-${question}`}>{question}</li>
              ))}
            </ol>
          </section>
        ) : null}

        <PersonalNotes
          initialBody={query.data.note}
          lessonId={lessonId}
          organizationId={organizationId}
          userId={query.data.userId}
        />

        {supportingResources.length ? (
          <details className="rounded-[14px] border border-[var(--learning-border)] bg-[var(--learning-paper)] px-4 py-3">
            <summary className="min-h-8 cursor-pointer list-none font-bold text-[var(--learning-green)] marker:hidden">
              Ressources complémentaires ({supportingResources.length})
            </summary>
            <div className="mt-4 grid gap-4">
              {supportingResources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          </details>
        ) : null}

        {query.data.activities.length ? (
          <section aria-labelledby="activities-title">
            <h2
              id="activities-title"
              className="text-lg font-extrabold text-[var(--learning-green)]"
            >
              Exercices et autocorrection
            </h2>
            <div className="mt-3 grid gap-4">
              {query.data.activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  lessonId={lessonId}
                  profileId={query.data.activeProfileId}
                  userId={query.data.userId}
                  pending={mutation.isPending}
                  onEvaluate={(item, evaluation) => mutation.mutate({ activity: item, evaluation })}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-9">
      {featuredResource ? (
        <section aria-label="Cours principal">
          <ResourceCard resource={featuredResource} />
        </section>
      ) : (
        <EmptyState
          title="Média en préparation"
          description="Le cours principal sera affiché ici dès sa publication."
        />
      )}
      {query.data.progressEnabled ? (
        <section
          className="rounded-3xl border border-[#D7E2D9] bg-[#F8FBF8] p-5 sm:p-6"
          aria-labelledby="session-progress-title"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B815F]">
                Ma progression
              </p>
              <h2
                id="session-progress-title"
                className="mt-1 font-serif text-2xl font-semibold text-[#173F2B]"
              >
                Avancement de la séance
              </h2>
              <div className="mt-3">
                <ProgressBadge status={progressStatus} />
              </div>
            </div>
            {!query.data.activeProfileId ? (
              <Button asChild variant="outline" className="min-h-12 rounded-xl">
                <Link to="/auth" search={{ portal: "family" }}>
                  Se connecter
                </Link>
              </Button>
            ) : progressStatus === "not_started" ? (
              <Button
                className="min-h-12 rounded-xl"
                disabled={progressMutation.isPending}
                onClick={() => progressMutation.mutate("start")}
              >
                Commencer
              </Button>
            ) : progressStatus === "in_progress" ? (
              <Button
                className="min-h-12 rounded-xl"
                disabled={progressMutation.isPending}
                onClick={() => progressMutation.mutate("complete")}
              >
                Marquer comme terminé
              </Button>
            ) : progressStatus === "completed" && requiresValidation ? (
              <Button className="min-h-12 rounded-xl" variant="outline" disabled>
                En attente de validation
              </Button>
            ) : (
              <Button className="min-h-12 rounded-xl" variant="outline" disabled>
                {progressStatus === "validated" ? "Séance validée" : "Séance terminée"}
              </Button>
            )}
          </div>
        </section>
      ) : null}
      {supportingResources.length ? (
        <section aria-labelledby="resources-title">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9B742E]">
                Étudier
              </p>
              <h2
                id="resources-title"
                className="mt-1 font-serif text-3xl font-semibold text-[#173F2B]"
              >
                Documents du cours
              </h2>
            </div>
            <span className="text-sm text-[#686D65]">
              {supportingResources.length} disponible{supportingResources.length > 1 ? "s" : ""}
            </span>
          </div>
          {supportingResources.length ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {supportingResources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
      <section className="grid gap-4 md:grid-cols-2" aria-label="Repères pédagogiques">
        <article className="rounded-3xl border border-[#D7E2D9] bg-[#F8FBF8] p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6B815F]">À retenir</p>
          {learningPoints.length ? (
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[#30342F]">
              {learningPoints.map((point, index) => (
                <li key={`${index}-${point}`} className="flex gap-3">
                  <span aria-hidden>•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[#686D65]">
              Les points clés seront ajoutés par l’équipe pédagogique.
            </p>
          )}
        </article>
        <article className="rounded-3xl border border-[#E4D8C3] bg-[#FAF7EF] p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9B742E]">
            Questions à se poser
          </p>
          {reflectionQuestions.length ? (
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-[#30342F]">
              {reflectionQuestions.map((question, index) => (
                <li key={`${index}-${question}`}>{question}</li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-[#686D65]">
              Les questions de réflexion seront ajoutées après validation éditoriale.
            </p>
          )}
        </article>
      </section>
      <section aria-labelledby="activities-title">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9B742E]">S’entraîner</p>
        <h2 id="activities-title" className="mt-1 font-serif text-3xl font-semibold text-[#173F2B]">
          Activités
        </h2>
        {query.data.activities.length ? (
          <div className="mt-5 grid gap-4">
            {query.data.activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                lessonId={lessonId}
                profileId={query.data.activeProfileId}
                userId={query.data.userId}
                pending={mutation.isPending}
                onEvaluate={(item, evaluation) => mutation.mutate({ activity: item, evaluation })}
              />
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              title="Aucune activité publiée"
              description="Vous pouvez continuer à consulter les ressources de cette séance."
            />
          </div>
        )}
      </section>
    </div>
  );
}
