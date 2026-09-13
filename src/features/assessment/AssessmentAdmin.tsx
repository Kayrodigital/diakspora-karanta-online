import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, CheckCircle2, Layers3, Plus, School, Target } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  assignLevelToCohort,
  createAssessmentPeriod,
  createCompetency,
  createProgram,
  createProgramLevel,
  loadCurriculumDashboard,
} from "./assessment-data";

type Props = { organizationId: string; userId: string };

const selectClass =
  "flex min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/25";

export function AssessmentAdmin({ organizationId, userId }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["curriculum-admin", organizationId];
  const dashboard = useQuery({ queryKey, queryFn: () => loadCurriculumDashboard(organizationId) });
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const action = useMutation({
    mutationFn: (operation: () => Promise<void>) => operation(),
    onSuccess: () => {
      toast.success("Référentiel pédagogique mis à jour");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (dashboard.isLoading) return <Skeleton className="h-80 rounded-3xl" />;
  if (dashboard.isError || !dashboard.data) {
    return (
      <p className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm">
        {dashboard.error?.message ?? "Impossible de charger le référentiel."}
      </p>
    );
  }

  const data = dashboard.data;
  const programId = selectedProgram || data.programs[0]?.id || "";
  const visibleLevels = data.levels.filter((level) => level.program_id === programId);
  const levelId =
    selectedLevel && visibleLevels.some((level) => level.id === selectedLevel)
      ? selectedLevel
      : visibleLevels[0]?.id || "";
  const visibleCompetencies = data.competencies.filter((item) => item.level_id === levelId);

  const runForm = (
    event: FormEvent<HTMLFormElement>,
    operation: (form: FormData) => Promise<void>,
  ) => {
    event.preventDefault();
    const target = event.currentTarget;
    action.mutate(() => operation(new FormData(target)), { onSuccess: () => target.reset() });
  };

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="secondary" className="rounded-full">
          Mesure des apprentissages
        </Badge>
        <h2 className="mt-3 text-xl font-semibold">Programmes, niveaux et compétences</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Construisez le référentiel avant de noter. Une classe est un groupe d’élèves ; son niveau
          correspond à un programme et à des compétences observables.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<BookOpenCheck className="size-5" />}
          value={data.programs.length}
          label="Programmes"
        />
        <Stat icon={<Layers3 className="size-5" />} value={data.levels.length} label="Niveaux" />
        <Stat
          icon={<Target className="size-5" />}
          value={data.competencies.length}
          label="Compétences"
        />
        <Stat
          icon={<School className="size-5" />}
          value={data.cohorts.filter((cohort) => cohort.program_level_id).length}
          label="Classes rattachées"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-5">
            <h3 className="font-semibold">1. Créer un programme</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Ex. Sciences islamiques ou Langue diakhanké.
            </p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) =>
                runForm(event, (form) =>
                  createProgram({
                    organizationId,
                    userId,
                    name: String(form.get("name")),
                    description: String(form.get("description") || ""),
                  }),
                )
              }
            >
              <Field label="Nom" htmlFor="program-name">
                <Input id="program-name" name="name" minLength={2} required />
              </Field>
              <Field label="Description" htmlFor="program-description">
                <Textarea id="program-description" name="description" rows={3} />
              </Field>
              <Button className="w-full rounded-xl" disabled={action.isPending}>
                <Plus className="size-4" /> Ajouter
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-5">
            <h3 className="font-semibold">2. Ajouter un niveau</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Le seuil conseillé est 80 % de compétences acquises.
            </p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) =>
                runForm(event, (form) =>
                  createProgramLevel({
                    organizationId,
                    programId: String(form.get("programId")),
                    name: String(form.get("name")),
                    description: String(form.get("description") || ""),
                    requiredMasteryPercent: Number(form.get("threshold")),
                    orderIndex: data.levels.filter(
                      (item) => item.program_id === String(form.get("programId")),
                    ).length,
                  }),
                )
              }
            >
              <Field label="Programme" htmlFor="level-program">
                <select
                  id="level-program"
                  name="programId"
                  className={selectClass}
                  required
                  value={programId}
                  onChange={(event) => setSelectedProgram(event.target.value)}
                >
                  <option value="" disabled>
                    Choisir
                  </option>
                  {data.programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nom du niveau" htmlFor="level-name">
                <Input id="level-name" name="name" minLength={2} required />
              </Field>
              <Field label="Seuil de validation (%)" htmlFor="level-threshold">
                <Input
                  id="level-threshold"
                  name="threshold"
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={80}
                  required
                />
              </Field>
              <Field label="Objectif" htmlFor="level-description">
                <Textarea id="level-description" name="description" rows={2} />
              </Field>
              <Button className="w-full rounded-xl" disabled={!programId || action.isPending}>
                <Plus className="size-4" /> Ajouter
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-5">
            <h3 className="font-semibold">3. Définir une compétence</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Décrivez ce que l’élève doit réussir seul.
            </p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) =>
                runForm(event, (form) =>
                  createCompetency({
                    organizationId,
                    levelId: String(form.get("levelId")),
                    name: String(form.get("name")),
                    successCriteria: String(form.get("criteria") || ""),
                    essential: form.get("essential") === "on",
                    orderIndex: data.competencies.filter(
                      (item) => item.level_id === String(form.get("levelId")),
                    ).length,
                  }),
                )
              }
            >
              <Field label="Niveau" htmlFor="competency-level">
                <select
                  id="competency-level"
                  name="levelId"
                  className={selectClass}
                  required
                  value={levelId}
                  onChange={(event) => setSelectedLevel(event.target.value)}
                >
                  <option value="" disabled>
                    Choisir
                  </option>
                  {visibleLevels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Compétence" htmlFor="competency-name">
                <Input id="competency-name" name="name" minLength={2} required />
              </Field>
              <Field label="Critère de réussite" htmlFor="competency-criteria">
                <Textarea
                  id="competency-criteria"
                  name="criteria"
                  rows={2}
                  placeholder="L’élève réussit seul et peut expliquer…"
                />
              </Field>
              <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm">
                <input type="checkbox" name="essential" className="size-4" /> Compétence essentielle
              </label>
              <Button className="w-full rounded-xl" disabled={!levelId || action.isPending}>
                <Plus className="size-4" /> Ajouter
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h3 className="font-semibold">Référentiel actuel</h3>
              <div className="mt-4 space-y-3">
                {visibleLevels.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setSelectedLevel(level.id)}
                    className={`w-full rounded-2xl border p-4 text-left ${level.id === levelId ? "border-primary bg-primary/[0.04]" : "border-border/70"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{level.name}</span>
                      <Badge variant="outline">Seuil {level.required_mastery_percent}%</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {data.competencies.filter((item) => item.level_id === level.id).length}{" "}
                      compétence(s)
                    </p>
                  </button>
                ))}
                {!visibleLevels.length && (
                  <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Créez d’abord un programme puis son premier niveau.
                  </p>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold">Compétences du niveau</h3>
              <div className="mt-4 space-y-2">
                {visibleCompetencies.map((competency) => (
                  <div key={competency.id} className="rounded-xl border border-border/70 p-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{competency.name}</p>
                        {competency.success_criteria && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {competency.success_criteria}
                          </p>
                        )}
                        {competency.is_essential && (
                          <Badge className="mt-2" variant="secondary">
                            Essentielle
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {!visibleCompetencies.length && (
                  <p className="text-sm text-muted-foreground">
                    Aucune compétence définie pour ce niveau.
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-5">
            <h3 className="font-semibold">Rattacher les classes à un niveau</h3>
            <div className="mt-4 space-y-3">
              {data.cohorts.map((cohort) => (
                <div
                  key={cohort.id}
                  className="grid gap-2 rounded-xl border border-border/70 p-3 sm:grid-cols-[1fr_220px] sm:items-center"
                >
                  <div>
                    <p className="text-sm font-medium">{cohort.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {cohort.level || "Aucun niveau historique"}
                    </p>
                  </div>
                  <select
                    aria-label={`Niveau de ${cohort.name}`}
                    className={selectClass}
                    value={cohort.program_level_id || ""}
                    onChange={(event) =>
                      action.mutate(() =>
                        assignLevelToCohort(cohort.id, event.target.value || null),
                      )
                    }
                  >
                    <option value="">Non rattachée</option>
                    {data.levels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardContent className="p-5">
            <h3 className="font-semibold">Périodes de bulletin</h3>
            <form
              className="mt-4 grid gap-3"
              onSubmit={(event) =>
                runForm(event, (form) =>
                  createAssessmentPeriod({
                    organizationId,
                    name: String(form.get("name")),
                    startsOn: String(form.get("startsOn")),
                    endsOn: String(form.get("endsOn")),
                  }),
                )
              }
            >
              <Field label="Nom" htmlFor="period-name">
                <Input id="period-name" name="name" placeholder="Trimestre 1" required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Début" htmlFor="period-start">
                  <Input id="period-start" name="startsOn" type="date" required />
                </Field>
                <Field label="Fin" htmlFor="period-end">
                  <Input id="period-end" name="endsOn" type="date" required />
                </Field>
              </div>
              <Button className="rounded-xl" disabled={action.isPending}>
                <Plus className="size-4" /> Créer la période
              </Button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.periods.map((period) => (
                <Badge key={period.id} variant="outline">
                  {period.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
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

function Stat({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
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
