import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
type Row<Name extends keyof Tables> = Tables[Name]["Row"];

export type MasteryLevel = "not_assessed" | "discovering" | "developing" | "acquired" | "mastered";

export const masteryLabels: Record<MasteryLevel, string> = {
  not_assessed: "Non évalué",
  discovering: "À découvrir",
  developing: "En cours",
  acquired: "Acquis",
  mastered: "Maîtrisé",
};

export const masteryRank: Record<MasteryLevel, number> = {
  not_assessed: 0,
  discovering: 1,
  developing: 2,
  acquired: 3,
  mastered: 4,
};

export type CurriculumDashboard = {
  programs: Row<"learning_programs">[];
  levels: Row<"program_levels">[];
  competencies: Row<"competencies">[];
  periods: Row<"assessment_periods">[];
  cohorts: Row<"cohorts">[];
};

export type AssessmentWorkspace = {
  assessments: Row<"assessments">[];
  links: Row<"assessment_competencies">[];
  results: Row<"assessment_results">[];
  evidence: Row<"competency_evidence">[];
  competencies: Row<"competencies">[];
  levels: Row<"program_levels">[];
  reports: Row<"report_cards">[];
};

export type LearnerProgress = {
  learners: Row<"learner_profiles">[];
  memberships: Row<"learner_cohort_memberships">[];
  cohorts: Row<"cohorts">[];
  assessments: Row<"assessments">[];
  results: Row<"assessment_results">[];
  evidence: Row<"competency_evidence">[];
  competencies: Row<"competencies">[];
  levels: Row<"program_levels">[];
  reports: Row<"report_cards">[];
  selfAssessments: Row<"learner_self_assessments">[];
};

function firstError(errors: Array<Error | null>): Error | null {
  return errors.find((error): error is Error => Boolean(error)) ?? null;
}

export function humanSlug(value: string): string {
  const base = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 54);
  return `${base || "programme"}-${Date.now().toString(36)}`;
}

export async function loadCurriculumDashboard(
  organizationId: string,
): Promise<CurriculumDashboard> {
  const [programs, levels, competencies, periods, cohorts] = await Promise.all([
    supabase
      .from("learning_programs")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at"),
    supabase
      .from("program_levels")
      .select("*")
      .eq("organization_id", organizationId)
      .order("order_index"),
    supabase
      .from("competencies")
      .select("*")
      .eq("organization_id", organizationId)
      .order("order_index"),
    supabase
      .from("assessment_periods")
      .select("*")
      .eq("organization_id", organizationId)
      .order("starts_on", { ascending: false }),
    supabase
      .from("cohorts")
      .select("*")
      .eq("organization_id", organizationId)
      .neq("status", "archived")
      .order("name"),
  ]);
  const error = firstError([
    programs.error,
    levels.error,
    competencies.error,
    periods.error,
    cohorts.error,
  ]);
  if (error) throw error;
  return {
    programs: programs.data ?? [],
    levels: levels.data ?? [],
    competencies: competencies.data ?? [],
    periods: periods.data ?? [],
    cohorts: cohorts.data ?? [],
  };
}

export async function createProgram(input: {
  organizationId: string;
  userId: string;
  name: string;
  description?: string;
}) {
  const { error } = await supabase.from("learning_programs").insert({
    organization_id: input.organizationId,
    created_by: input.userId,
    name: input.name.trim(),
    slug: humanSlug(input.name),
    description: input.description?.trim() || null,
    status: "active",
  });
  if (error) throw error;
}

export async function createProgramLevel(input: {
  organizationId: string;
  programId: string;
  name: string;
  description?: string;
  requiredMasteryPercent: number;
  orderIndex: number;
}) {
  const { error } = await supabase.from("program_levels").insert({
    organization_id: input.organizationId,
    program_id: input.programId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    required_mastery_percent: input.requiredMasteryPercent,
    order_index: input.orderIndex,
    status: "active",
  });
  if (error) throw error;
}

export async function createCompetency(input: {
  organizationId: string;
  levelId: string;
  name: string;
  successCriteria?: string;
  essential: boolean;
  orderIndex: number;
}) {
  const { error } = await supabase.from("competencies").insert({
    organization_id: input.organizationId,
    level_id: input.levelId,
    name: input.name.trim(),
    success_criteria: input.successCriteria?.trim() || null,
    is_essential: input.essential,
    order_index: input.orderIndex,
    status: "active",
  });
  if (error) throw error;
}

export async function createAssessmentPeriod(input: {
  organizationId: string;
  name: string;
  startsOn: string;
  endsOn: string;
}) {
  const { error } = await supabase.from("assessment_periods").insert({
    organization_id: input.organizationId,
    name: input.name.trim(),
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    status: "open",
  });
  if (error) throw error;
}

export async function assignLevelToCohort(cohortId: string, levelId: string | null) {
  const { error } = await supabase
    .from("cohorts")
    .update({ program_level_id: levelId, updated_at: new Date().toISOString() })
    .eq("id", cohortId);
  if (error) throw error;
}

export async function loadAssessmentWorkspace(
  organizationId: string,
  cohortIds: string[],
): Promise<AssessmentWorkspace> {
  if (!cohortIds.length) {
    return {
      assessments: [],
      links: [],
      results: [],
      evidence: [],
      competencies: [],
      levels: [],
      reports: [],
    };
  }
  const [assessments, competencies, levels, reports] = await Promise.all([
    supabase
      .from("assessments")
      .select("*")
      .eq("organization_id", organizationId)
      .in("cohort_id", cohortIds)
      .order("scheduled_on", { ascending: false }),
    supabase
      .from("competencies")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("order_index"),
    supabase
      .from("program_levels")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("order_index"),
    supabase
      .from("report_cards")
      .select("*")
      .eq("organization_id", organizationId)
      .in("cohort_id", cohortIds)
      .order("created_at", { ascending: false }),
  ]);
  const primaryError = firstError([
    assessments.error,
    competencies.error,
    levels.error,
    reports.error,
  ]);
  if (primaryError) throw primaryError;
  const assessmentIds = (assessments.data ?? []).map((item) => item.id);
  const [links, results] = assessmentIds.length
    ? await Promise.all([
        supabase.from("assessment_competencies").select("*").in("assessment_id", assessmentIds),
        supabase.from("assessment_results").select("*").in("assessment_id", assessmentIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  const resultIds = (results.data ?? []).map((item) => item.id);
  const evidence = resultIds.length
    ? await supabase.from("competency_evidence").select("*").in("result_id", resultIds)
    : { data: [], error: null };
  const error = firstError([links.error, results.error, evidence.error]);
  if (error) throw error;
  return {
    assessments: assessments.data ?? [],
    links: links.data ?? [],
    results: results.data ?? [],
    evidence: evidence.data ?? [],
    competencies: competencies.data ?? [],
    levels: levels.data ?? [],
    reports: reports.data ?? [],
  };
}

export async function createAssessment(input: {
  organizationId: string;
  userId: string;
  cohortId: string;
  title: string;
  type: "diagnostic" | "formative" | "module" | "final";
  evidenceType: "quiz" | "written" | "oral" | "voice" | "observation" | "mixed";
  scheduledOn?: string;
  competencyIds: string[];
}) {
  const { data, error } = await supabase
    .from("assessments")
    .insert({
      organization_id: input.organizationId,
      cohort_id: input.cohortId,
      title: input.title.trim(),
      assessment_type: input.type,
      evidence_type: input.evidenceType,
      max_score: 100,
      passing_score: 70,
      scheduled_on: input.scheduledOn || null,
      status: "published",
      created_by: input.userId,
    })
    .select("id")
    .single();
  if (error) throw error;
  if (input.competencyIds.length) {
    const { error: linkError } = await supabase.from("assessment_competencies").insert(
      input.competencyIds.map((competencyId) => ({
        organization_id: input.organizationId,
        assessment_id: data.id,
        competency_id: competencyId,
      })),
    );
    if (linkError) throw linkError;
  }
}

export async function saveAssessmentResult(input: {
  organizationId: string;
  assessmentId: string;
  learnerId: string;
  userId: string;
  scorePercent: number;
  masteryLevel: Exclude<MasteryLevel, "not_assessed">;
  feedback?: string;
  competencyIds: string[];
}) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("assessment_results")
    .upsert(
      {
        organization_id: input.organizationId,
        assessment_id: input.assessmentId,
        learner_id: input.learnerId,
        raw_score: input.scorePercent,
        score_percent: input.scorePercent,
        mastery_level: input.masteryLevel,
        teacher_feedback: input.feedback?.trim() || null,
        evaluated_by: input.userId,
        evaluated_at: now,
        published_at: now,
        status: "published",
        updated_at: now,
      },
      { onConflict: "assessment_id,learner_id" },
    )
    .select("id")
    .single();
  if (error) throw error;
  if (input.competencyIds.length) {
    const { error: evidenceError } = await supabase.from("competency_evidence").upsert(
      input.competencyIds.map((competencyId) => ({
        organization_id: input.organizationId,
        result_id: data.id,
        competency_id: competencyId,
        score_percent: input.scorePercent,
        mastery_level: input.masteryLevel,
        feedback: input.feedback?.trim() || null,
        updated_at: now,
      })),
      { onConflict: "result_id,competency_id" },
    );
    if (evidenceError) throw evidenceError;
  }
}

export async function createReportCard(input: {
  organizationId: string;
  userId: string;
  learnerId: string;
  cohortId: string;
  title: string;
  strengths?: string;
  priorities?: string;
  comment?: string;
  decision: "continue" | "advance" | "advance_with_support" | "review_required";
  results: Row<"assessment_results">[];
}) {
  const published = input.results.filter(
    (result) => result.learner_id === input.learnerId && result.status === "published",
  );
  const scored = published.filter((result) => result.score_percent !== null);
  const overallScore = scored.length
    ? Math.round(
        scored.reduce((sum, result) => sum + Number(result.score_percent), 0) / scored.length,
      )
    : null;
  const mastered = published.filter(
    (result) => masteryRank[result.mastery_level as MasteryLevel] >= masteryRank.acquired,
  ).length;
  const masteryPercent = published.length ? Math.round((mastered / published.length) * 100) : null;
  const now = new Date().toISOString();
  const { error } = await supabase.from("report_cards").insert({
    organization_id: input.organizationId,
    learner_id: input.learnerId,
    cohort_id: input.cohortId,
    title: input.title.trim(),
    overall_score: overallScore,
    mastery_percent: masteryPercent,
    strengths: input.strengths?.trim() || null,
    priorities: input.priorities?.trim() || null,
    teacher_comment: input.comment?.trim() || null,
    decision: input.decision,
    status: "published",
    published_at: now,
    created_by: input.userId,
  });
  if (error) throw error;
}

export async function loadLearnerProgress(organizationId: string): Promise<LearnerProgress> {
  const learners = await supabase
    .from("learner_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .neq("status", "archived")
    .order("full_name");
  if (learners.error) throw learners.error;
  const learnerIds = (learners.data ?? []).map((learner) => learner.id);
  if (!learnerIds.length) {
    return {
      learners: [],
      memberships: [],
      cohorts: [],
      assessments: [],
      results: [],
      evidence: [],
      competencies: [],
      levels: [],
      reports: [],
      selfAssessments: [],
    };
  }
  const [results, competencies, levels, reports, selfAssessments, memberships] = await Promise.all([
    supabase
      .from("assessment_results")
      .select("*")
      .eq("organization_id", organizationId)
      .in("learner_id", learnerIds)
      .eq("status", "published")
      .order("evaluated_at", { ascending: false }),
    supabase
      .from("competencies")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("order_index"),
    supabase
      .from("program_levels")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("order_index"),
    supabase
      .from("report_cards")
      .select("*")
      .eq("organization_id", organizationId)
      .in("learner_id", learnerIds)
      .eq("status", "published")
      .order("published_at", { ascending: false }),
    supabase
      .from("learner_self_assessments")
      .select("*")
      .eq("organization_id", organizationId)
      .in("learner_id", learnerIds),
    supabase
      .from("learner_cohort_memberships")
      .select("*")
      .eq("organization_id", organizationId)
      .in("learner_id", learnerIds)
      .in("status", ["active", "completed"]),
  ]);
  const error = firstError([
    results.error,
    competencies.error,
    levels.error,
    reports.error,
    selfAssessments.error,
    memberships.error,
  ]);
  if (error) throw error;
  const assessmentIds = [...new Set((results.data ?? []).map((result) => result.assessment_id))];
  const resultIds = (results.data ?? []).map((result) => result.id);
  const cohortIds = [...new Set((memberships.data ?? []).map((item) => item.cohort_id))];
  const [assessments, evidence, cohorts] = await Promise.all([
    assessmentIds.length
      ? supabase.from("assessments").select("*").in("id", assessmentIds)
      : Promise.resolve({ data: [], error: null }),
    resultIds.length
      ? supabase.from("competency_evidence").select("*").in("result_id", resultIds)
      : Promise.resolve({ data: [], error: null }),
    cohortIds.length
      ? supabase.from("cohorts").select("*").in("id", cohortIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const relatedError = firstError([assessments.error, evidence.error, cohorts.error]);
  if (relatedError) throw relatedError;
  return {
    learners: learners.data ?? [],
    memberships: memberships.data ?? [],
    cohorts: cohorts.data ?? [],
    assessments: assessments.data ?? [],
    results: results.data ?? [],
    evidence: evidence.data ?? [],
    competencies: competencies.data ?? [],
    levels: levels.data ?? [],
    reports: reports.data ?? [],
    selfAssessments: selfAssessments.data ?? [],
  };
}

export async function saveSelfAssessment(input: {
  organizationId: string;
  learnerId: string;
  competencyId: string;
  confidence: "not_yet" | "almost" | "yes";
}) {
  const { error } = await supabase.from("learner_self_assessments").upsert(
    {
      organization_id: input.organizationId,
      learner_id: input.learnerId,
      competency_id: input.competencyId,
      confidence: input.confidence,
      assessed_at: new Date().toISOString(),
    },
    { onConflict: "learner_id,competency_id" },
  );
  if (error) throw error;
}
