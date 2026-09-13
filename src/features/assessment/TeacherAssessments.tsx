import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Plus,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { TeacherCohort } from "@/features/professeur/teacher-data";
import {
  createAssessment,
  createReportCard,
  loadAssessmentWorkspace,
  masteryLabels,
  masteryRank,
  saveAssessmentResult,
  type MasteryLevel,
} from "./assessment-data";

type Props = { organizationId: string; userId: string; cohorts: TeacherCohort[] };
const selectClass =
  "flex min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25";

function masteryFromScore(score: number): Exclude<MasteryLevel, "not_assessed"> {
  if (score < 50) return "discovering";
  if (score < 70) return "developing";
  if (score < 85) return "acquired";
  return "mastered";
}

export function TeacherAssessments({ organizationId, userId, cohorts }: Props) {
  const queryClient = useQueryClient();
  const queryKey = [
    "teacher-assessments",
    organizationId,
    cohorts.map((item) => item.id).join(","),
  ];
  const workspace = useQuery({
    queryKey,
    queryFn: () =>
      loadAssessmentWorkspace(
        organizationId,
        cohorts.map((item) => item.id),
      ),
  });
  const [cohortId, setCohortId] = useState(cohorts[0]?.id || "");
  const [assessmentId, setAssessmentId] = useState("");
  const mutation = useMutation({
    mutationFn: (operation: () => Promise<void>) => operation(),
    onSuccess: () => {
      toast.success("Données pédagogiques enregistrées");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const selectedCohort = cohorts.find((item) => item.id === cohortId) ?? cohorts[0];
  const data = workspace.data;
  const assessments = useMemo(
    () => data?.assessments.filter((item) => item.cohort_id === selectedCohort?.id) ?? [],
    [data, selectedCohort?.id],
  );
  const selectedAssessment = assessments.find((item) => item.id === assessmentId) ?? assessments[0];
  const competencyIds =
    data?.links
      .filter((item) => item.assessment_id === selectedAssessment?.id)
      .map((item) => item.competency_id) ?? [];
  const levelCompetencies =
    data?.competencies.filter((item) => item.level_id === selectedCohort?.programLevelId) ?? [];

  if (workspace.isLoading) return <Skeleton className="h-96 rounded-3xl" />;
  if (workspace.isError || !data)
    return (
      <p className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm">
        {workspace.error?.message ?? "Impossible de charger les évaluations."}
      </p>
    );
  if (!selectedCohort)
    return (
      <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Aucune classe ne vous est attribuée.
      </p>
    );

  const run = (event: FormEvent<HTMLFormElement>, operation: (form: FormData) => Promise<void>) => {
    event.preventDefault();
    const target = event.currentTarget;
    mutation.mutate(() => operation(new FormData(target)), { onSuccess: () => target.reset() });
  };
  const classResults = data.results.filter((result) =>
    assessments.some((assessment) => assessment.id === result.assessment_id),
  );
  const publishedResults = classResults.filter((result) => result.status === "published");
  const acquired = publishedResults.filter(
    (result) => masteryRank[result.mastery_level as MasteryLevel] >= masteryRank.acquired,
  ).length;
  const masteryPercent = publishedResults.length
    ? Math.round((acquired / publishedResults.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Évaluations et maîtrise</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mesurez les acquis sans confondre progression, assiduité et maîtrise.
          </p>
        </div>
        {cohorts.length > 1 && (
          <select
            aria-label="Classe évaluée"
            className={`${selectClass} sm:w-64`}
            value={selectedCohort.id}
            onChange={(event) => {
              setCohortId(event.target.value);
              setAssessmentId("");
            }}
          >
            {cohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          icon={<ClipboardCheck className="size-5" />}
          value={assessments.length}
          label="Évaluations"
        />
        <Metric
          icon={<Target className="size-5" />}
          value={`${masteryPercent}%`}
          label="Acquis ou maîtrisé"
        />
        <Metric
          icon={<FileText className="size-5" />}
          value={data.reports.filter((item) => item.cohort_id === selectedCohort.id).length}
          label="Bulletins publiés"
        />
      </div>

      {!selectedCohort.programLevelId && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          Cette classe n’est rattachée à aucun niveau pédagogique. Un administrateur doit d’abord
          choisir son programme et son niveau.
        </div>
      )}

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <h3 className="font-semibold">Créer une évaluation</h3>
          <form
            className="mt-4 grid gap-3 lg:grid-cols-5"
            onSubmit={(event) =>
              run(event, (form) =>
                createAssessment({
                  organizationId,
                  userId,
                  cohortId: selectedCohort.id,
                  title: String(form.get("title")),
                  type: String(form.get("type")) as "diagnostic" | "formative" | "module" | "final",
                  evidenceType: String(form.get("evidenceType")) as
                    "quiz" | "written" | "oral" | "voice" | "observation" | "mixed",
                  scheduledOn: String(form.get("date") || ""),
                  competencyIds: form.getAll("competencyIds").map(String),
                }),
              )
            }
          >
            <Field label="Titre" htmlFor="assessment-title">
              <Input
                id="assessment-title"
                name="title"
                required
                minLength={2}
                placeholder="Validation du module 1"
              />
            </Field>
            <Field label="Type" htmlFor="assessment-type">
              <select id="assessment-type" name="type" className={selectClass}>
                <option value="diagnostic">Positionnement</option>
                <option value="formative">Continue</option>
                <option value="module">Fin de module</option>
                <option value="final">Fin de niveau</option>
              </select>
            </Field>
            <Field label="Preuve" htmlFor="evidence-type">
              <select id="evidence-type" name="evidenceType" className={selectClass}>
                <option value="mixed">Mixte</option>
                <option value="oral">Orale</option>
                <option value="voice">Vocale</option>
                <option value="quiz">Quiz</option>
                <option value="written">Écrite</option>
                <option value="observation">Observation</option>
              </select>
            </Field>
            <Field label="Date" htmlFor="assessment-date">
              <Input id="assessment-date" name="date" type="date" />
            </Field>
            <div className="flex items-end">
              <Button className="h-11 w-full rounded-xl" disabled={mutation.isPending}>
                <Plus className="size-4" /> Créer
              </Button>
            </div>
            {levelCompetencies.length > 0 && (
              <fieldset className="lg:col-span-5">
                <legend className="mb-2 text-sm font-medium">Compétences évaluées</legend>
                <div className="flex flex-wrap gap-2">
                  {levelCompetencies.map((competency) => (
                    <label
                      key={competency.id}
                      className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-2 text-xs"
                    >
                      <input type="checkbox" name="competencyIds" value={competency.id} />{" "}
                      {competency.name}
                      {competency.is_essential ? " · essentielle" : ""}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </form>
        </CardContent>
      </Card>

      {assessments.length ? (
        <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            {assessments.map((assessment) => (
              <button
                key={assessment.id}
                type="button"
                onClick={() => setAssessmentId(assessment.id)}
                className={`w-full rounded-2xl border p-4 text-left ${assessment.id === selectedAssessment?.id ? "border-primary bg-primary/[0.04]" : "border-border/70"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{assessment.title}</p>
                  <Badge variant="outline">{assessment.assessment_type}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {data.results.filter((result) => result.assessment_id === assessment.id).length}/
                  {selectedCohort.learners.length} élève(s) évalué(s)
                </p>
              </button>
            ))}
          </div>
          {selectedAssessment && (
            <Card className="border-border/70 shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{selectedAssessment.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Saisissez une preuve et publiez le résultat à l’élève et au parent.
                    </p>
                  </div>
                  <Badge variant="secondary">{competencyIds.length} compétence(s)</Badge>
                </div>
                <div className="mt-5 space-y-4">
                  {selectedCohort.learners.map((learner) => {
                    const existing = data.results.find(
                      (result) =>
                        result.assessment_id === selectedAssessment.id &&
                        result.learner_id === learner.id,
                    );
                    return (
                      <form
                        key={learner.id}
                        className="rounded-2xl border border-border/70 p-4"
                        onSubmit={(event) =>
                          run(event, async (form) => {
                            const score = Number(form.get("score"));
                            await saveAssessmentResult({
                              organizationId,
                              assessmentId: selectedAssessment.id,
                              learnerId: learner.id,
                              userId,
                              scorePercent: score,
                              masteryLevel: String(
                                form.get("mastery") || masteryFromScore(score),
                              ) as Exclude<MasteryLevel, "not_assessed">,
                              feedback: String(form.get("feedback") || ""),
                              competencyIds,
                            });
                          })
                        }
                      >
                        <div className="grid gap-3 lg:grid-cols-[1fr_100px_160px_1.3fr_auto] lg:items-end">
                          <div>
                            <p className="font-medium">
                              {learner.preferredName || learner.fullName}
                            </p>
                            {existing && (
                              <p className="mt-1 text-xs text-primary">
                                Résultat publié · {existing.score_percent}%
                              </p>
                            )}
                          </div>
                          <Field label="Score /100" htmlFor={`score-${learner.id}`}>
                            <Input
                              id={`score-${learner.id}`}
                              name="score"
                              type="number"
                              min={0}
                              max={100}
                              defaultValue={existing?.score_percent ?? ""}
                              required
                            />
                          </Field>
                          <Field label="Maîtrise" htmlFor={`mastery-${learner.id}`}>
                            <select
                              id={`mastery-${learner.id}`}
                              name="mastery"
                              className={selectClass}
                              defaultValue={existing?.mastery_level || "acquired"}
                            >
                              <option value="discovering">À découvrir</option>
                              <option value="developing">En cours</option>
                              <option value="acquired">Acquis</option>
                              <option value="mastered">Maîtrisé</option>
                            </select>
                          </Field>
                          <Field label="Retour" htmlFor={`feedback-${learner.id}`}>
                            <Input
                              id={`feedback-${learner.id}`}
                              name="feedback"
                              defaultValue={existing?.teacher_feedback || ""}
                              placeholder="Point fort et prochaine étape"
                            />
                          </Field>
                          <Button className="h-11 rounded-xl" disabled={mutation.isPending}>
                            <CheckCircle2 className="size-4" /> Publier
                          </Button>
                        </div>
                      </form>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Créez la première évaluation de cette classe.
        </p>
      )}

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <BarChart3 className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold">Niveau de la classe</h3>
              <p className="text-sm text-muted-foreground">
                Répartition calculée sur les résultats publiés.
              </p>
            </div>
          </div>
          <Progress value={masteryPercent} className="mt-5 h-3" />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["discovering", "developing", "acquired", "mastered"] as MasteryLevel[]).map(
              (level) => (
                <div key={level} className="rounded-xl bg-muted/50 p-3 text-center">
                  <p className="text-xl font-semibold">
                    {publishedResults.filter((result) => result.mastery_level === level).length}
                  </p>
                  <p className="text-xs text-muted-foreground">{masteryLabels[level]}</p>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Award className="size-5 text-primary" />
            <div>
              <h3 className="font-semibold">Publier un bulletin</h3>
              <p className="text-sm text-muted-foreground">
                La moyenne et le taux de maîtrise sont calculés automatiquement ; la décision reste
                pédagogique.
              </p>
            </div>
          </div>
          <form
            className="mt-5 grid gap-3 lg:grid-cols-2"
            onSubmit={(event) =>
              run(event, (form) =>
                createReportCard({
                  organizationId,
                  userId,
                  learnerId: String(form.get("learnerId")),
                  cohortId: selectedCohort.id,
                  title: String(form.get("title")),
                  strengths: String(form.get("strengths") || ""),
                  priorities: String(form.get("priorities") || ""),
                  comment: String(form.get("comment") || ""),
                  decision: String(form.get("decision")) as
                    "continue" | "advance" | "advance_with_support" | "review_required",
                  results: data.results,
                }),
              )
            }
          >
            <Field label="Élève" htmlFor="report-learner">
              <select id="report-learner" name="learnerId" className={selectClass} required>
                <option value="">Choisir</option>
                {selectedCohort.learners.map((learner) => (
                  <option key={learner.id} value={learner.id}>
                    {learner.fullName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Titre du bulletin" htmlFor="report-title">
              <Input
                id="report-title"
                name="title"
                placeholder="Bulletin du trimestre 1"
                required
              />
            </Field>
            <Field label="Points forts" htmlFor="report-strengths">
              <Textarea id="report-strengths" name="strengths" rows={2} />
            </Field>
            <Field label="Priorités" htmlFor="report-priorities">
              <Textarea id="report-priorities" name="priorities" rows={2} />
            </Field>
            <Field label="Appréciation" htmlFor="report-comment">
              <Textarea id="report-comment" name="comment" rows={2} />
            </Field>
            <Field label="Décision" htmlFor="report-decision">
              <select id="report-decision" name="decision" className={selectClass}>
                <option value="continue">Poursuivre le niveau</option>
                <option value="advance">Passage au niveau suivant</option>
                <option value="advance_with_support">Passage avec accompagnement</option>
                <option value="review_required">Réévaluation nécessaire</option>
              </select>
            </Field>
            <Button className="rounded-xl lg:col-span-2" disabled={mutation.isPending}>
              <Award className="size-4" /> Calculer et publier le bulletin
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
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
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
function Metric({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
