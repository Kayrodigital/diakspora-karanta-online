import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, BookOpenCheck, CheckCircle2, CircleDot, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  loadLearnerProgress,
  masteryLabels,
  masteryRank,
  saveSelfAssessment,
  type MasteryLevel,
} from "./assessment-data";

type Props = { organizationId: string; allowSelfAssessment?: boolean };
const decisionLabels: Record<string, string> = {
  continue: "Poursuite du niveau",
  advance: "Passage au niveau suivant",
  advance_with_support: "Passage avec accompagnement",
  review_required: "Réévaluation nécessaire",
};

export function LearnerProgressDashboard({ organizationId, allowSelfAssessment = false }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["learner-assessment-progress", organizationId];
  const query = useQuery({ queryKey, queryFn: () => loadLearnerProgress(organizationId) });
  const [learnerId, setLearnerId] = useState("");
  const selfMutation = useMutation({
    mutationFn: saveSelfAssessment,
    onSuccess: () => {
      toast.success("Auto-évaluation enregistrée");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const data = query.data;
  const learner = data?.learners.find((item) => item.id === learnerId) ?? data?.learners[0];
  const learnerResults = useMemo(
    () => data?.results.filter((item) => item.learner_id === learner?.id) ?? [],
    [data, learner?.id],
  );
  const learnerEvidence = useMemo(() => {
    if (!data) return [];
    const resultIds = new Set(learnerResults.map((item) => item.id));
    return data.evidence.filter((item) => resultIds.has(item.result_id));
  }, [data, learnerResults]);

  if (query.isLoading) return <Skeleton className="h-80 rounded-3xl" />;
  if (query.isError || !data)
    return (
      <p className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm">
        {query.error?.message ?? "Impossible de charger la progression."}
      </p>
    );
  if (!learner)
    return (
      <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Aucun profil élève n’est rattaché à ce compte.
      </p>
    );

  const latestEvidence = new Map<string, (typeof learnerEvidence)[number]>();
  for (const evidence of learnerEvidence) {
    const current = latestEvidence.get(evidence.competency_id);
    if (!current || current.updated_at < evidence.updated_at)
      latestEvidence.set(evidence.competency_id, evidence);
  }
  const evaluated = [...latestEvidence.values()];
  const acquired = evaluated.filter(
    (item) => masteryRank[item.mastery_level as MasteryLevel] >= masteryRank.acquired,
  ).length;
  const masteryPercent = evaluated.length ? Math.round((acquired / evaluated.length) * 100) : 0;
  const scores = learnerResults
    .filter((item) => item.score_percent !== null)
    .map((item) => Number(item.score_percent));
  const average = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : null;
  const reports = data.reports.filter((item) => item.learner_id === learner.id);
  const learnerCohortIds = new Set(
    data.memberships.filter((item) => item.learner_id === learner.id).map((item) => item.cohort_id),
  );
  const learnerLevelIds = new Set(
    data.cohorts
      .filter((cohort) => learnerCohortIds.has(cohort.id) && cohort.program_level_id)
      .map((cohort) => cohort.program_level_id),
  );
  const visibleCompetencies = data.competencies.filter(
    (competency) => learnerLevelIds.size === 0 || learnerLevelIds.has(competency.level_id),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="secondary" className="rounded-full">
            Suivi pédagogique
          </Badge>
          <h2 className="mt-3 text-xl font-semibold">Mes acquis et mes objectifs</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Les compétences sont validées à partir de preuves réelles, pas uniquement des leçons
            terminées.
          </p>
        </div>
        {data.learners.length > 1 && (
          <select
            aria-label="Élève suivi"
            className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm"
            value={learner.id}
            onChange={(event) => setLearnerId(event.target.value)}
          >
            {data.learners.map((item) => (
              <option key={item.id} value={item.id}>
                {item.full_name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          icon={<Target className="size-5" />}
          value={`${masteryPercent}%`}
          label="Compétences acquises"
        />
        <Metric
          icon={<TrendingUp className="size-5" />}
          value={average === null ? "—" : `${average}/100`}
          label="Moyenne évaluée"
        />
        <Metric
          icon={<BookOpenCheck className="size-5" />}
          value={learnerResults.length}
          label="Évaluations reçues"
        />
        <Metric icon={<Award className="size-5" />} value={reports.length} label="Bulletins" />
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Maîtrise des compétences</h3>
              <p className="text-sm text-muted-foreground">
                {acquired} acquise(s) sur {evaluated.length} évaluée(s)
              </p>
            </div>
            <span className="text-2xl font-semibold text-primary">{masteryPercent}%</span>
          </div>
          <Progress value={masteryPercent} className="mt-4 h-3" />
          <div className="mt-5 space-y-3">
            {visibleCompetencies.map((competency) => {
              const evidence = latestEvidence.get(competency.id);
              const self = data.selfAssessments.find(
                (item) => item.learner_id === learner.id && item.competency_id === competency.id,
              );
              return (
                <div key={competency.id} className="rounded-2xl border border-border/70 p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${evidence && masteryRank[evidence.mastery_level as MasteryLevel] >= masteryRank.acquired ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                    >
                      {evidence ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        <CircleDot className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{competency.name}</p>
                        {competency.is_essential && <Badge variant="secondary">Essentielle</Badge>}
                        <Badge variant="outline">
                          {
                            masteryLabels[
                              (evidence?.mastery_level || "not_assessed") as MasteryLevel
                            ]
                          }
                        </Badge>
                      </div>
                      {competency.success_criteria && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Pour réussir : {competency.success_criteria}
                        </p>
                      )}
                      {evidence?.feedback && (
                        <p className="mt-2 rounded-xl bg-muted/50 p-3 text-sm">
                          {evidence.feedback}
                        </p>
                      )}
                      {allowSelfAssessment && learner.user_id && (
                        <div className="mt-3">
                          <p className="mb-2 text-xs font-medium">
                            Est-ce que tu penses avoir compris ?
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(
                              [
                                ["not_yet", "Pas encore"],
                                ["almost", "Presque"],
                                ["yes", "Oui"],
                              ] as const
                            ).map(([value, label]) => (
                              <Button
                                key={value}
                                type="button"
                                size="sm"
                                variant={self?.confidence === value ? "default" : "outline"}
                                className="rounded-full"
                                disabled={selfMutation.isPending}
                                onClick={() =>
                                  selfMutation.mutate({
                                    organizationId,
                                    learnerId: learner.id,
                                    competencyId: competency.id,
                                    confidence: value,
                                  })
                                }
                              >
                                {label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {!visibleCompetencies.length && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Le référentiel de compétences sera bientôt publié par l’équipe pédagogique.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <h3 className="font-semibold">Dernières évaluations</h3>
          <div className="mt-4 space-y-3">
            {learnerResults.slice(0, 8).map((result) => {
              const assessment = data.assessments.find((item) => item.id === result.assessment_id);
              return (
                <div
                  key={result.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border/70 p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{assessment?.title || "Évaluation"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {result.teacher_feedback || "Résultat publié par le professeur"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {masteryLabels[result.mastery_level as MasteryLevel]}
                    </Badge>
                    <span className="text-lg font-semibold">
                      {result.score_percent === null ? "—" : `${result.score_percent}/100`}
                    </span>
                  </div>
                </div>
              );
            })}
            {!learnerResults.length && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucun résultat publié pour le moment.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <h3 className="font-semibold">Bulletins</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {reports.map((report) => (
              <article key={report.id} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{report.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {report.published_at
                        ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
                            new Date(report.published_at),
                          )
                        : ""}
                    </p>
                  </div>
                  <Award className="size-5 text-primary" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-lg font-semibold">{report.overall_score ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">Moyenne /100</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-lg font-semibold">{report.mastery_percent ?? "—"}%</p>
                    <p className="text-xs text-muted-foreground">Maîtrise</p>
                  </div>
                </div>
                {report.teacher_comment && <p className="mt-3 text-sm">{report.teacher_comment}</p>}
                <Badge className="mt-3" variant="secondary">
                  {decisionLabels[report.decision] ?? report.decision}
                </Badge>
              </article>
            ))}
            {!reports.length && (
              <p className="text-sm text-muted-foreground">Aucun bulletin publié pour le moment.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-4">
        <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <p className="mt-3 text-xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
