-- Karanta evaluation core: curricula, competencies, assessment evidence,
-- learner self-assessment and publishable report cards.

CREATE TABLE public.learning_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 160),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug),
  UNIQUE (id, organization_id)
);

CREATE TABLE public.program_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  code text,
  description text,
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  required_mastery_percent integer NOT NULL DEFAULT 80 CHECK (required_mastery_percent BETWEEN 1 AND 100),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, order_index),
  UNIQUE (id, organization_id),
  FOREIGN KEY (program_id, organization_id)
    REFERENCES public.learning_programs(id, organization_id) ON DELETE CASCADE
);

ALTER TABLE public.cohorts
  ADD COLUMN IF NOT EXISTS program_level_id uuid REFERENCES public.program_levels(id) ON DELETE SET NULL;

CREATE INDEX cohorts_program_level_idx ON public.cohorts (program_level_id)
  WHERE program_level_id IS NOT NULL;

CREATE TABLE public.competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  level_id uuid NOT NULL,
  code text,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 200),
  description text,
  success_criteria text,
  is_essential boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (level_id, order_index),
  UNIQUE (id, organization_id),
  FOREIGN KEY (level_id, organization_id)
    REFERENCES public.program_levels(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE public.lesson_competencies (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL,
  competency_id uuid NOT NULL,
  weight numeric(5,2) NOT NULL DEFAULT 1 CHECK (weight > 0),
  PRIMARY KEY (lesson_id, competency_id),
  FOREIGN KEY (lesson_id, organization_id)
    REFERENCES public.lessons(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (competency_id, organization_id)
    REFERENCES public.competencies(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE public.assessment_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('planned', 'open', 'closed', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on),
  UNIQUE (organization_id, name, starts_on),
  UNIQUE (id, organization_id)
);

CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cohort_id uuid NOT NULL,
  course_id uuid,
  lesson_id uuid,
  period_id uuid,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  description text,
  assessment_type text NOT NULL DEFAULT 'formative'
    CHECK (assessment_type IN ('diagnostic', 'formative', 'module', 'final')),
  evidence_type text NOT NULL DEFAULT 'mixed'
    CHECK (evidence_type IN ('quiz', 'written', 'oral', 'voice', 'observation', 'mixed')),
  max_score numeric(8,2) NOT NULL DEFAULT 100 CHECK (max_score > 0),
  passing_score numeric(5,2) NOT NULL DEFAULT 70 CHECK (passing_score BETWEEN 0 AND 100),
  scheduled_on date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'archived')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  FOREIGN KEY (cohort_id, organization_id)
    REFERENCES public.cohorts(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (course_id, organization_id)
    REFERENCES public.courses(id, organization_id) ON DELETE SET NULL (course_id),
  FOREIGN KEY (lesson_id, organization_id)
    REFERENCES public.lessons(id, organization_id) ON DELETE SET NULL (lesson_id),
  FOREIGN KEY (period_id, organization_id)
    REFERENCES public.assessment_periods(id, organization_id) ON DELETE SET NULL (period_id)
);

CREATE TABLE public.assessment_competencies (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL,
  competency_id uuid NOT NULL,
  weight numeric(5,2) NOT NULL DEFAULT 1 CHECK (weight > 0),
  PRIMARY KEY (assessment_id, competency_id),
  FOREIGN KEY (assessment_id, organization_id)
    REFERENCES public.assessments(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (competency_id, organization_id)
    REFERENCES public.competencies(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE public.assessment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL,
  learner_id uuid NOT NULL REFERENCES public.learner_profiles(id) ON DELETE CASCADE,
  raw_score numeric(8,2) CHECK (raw_score IS NULL OR raw_score >= 0),
  score_percent numeric(5,2) CHECK (score_percent IS NULL OR score_percent BETWEEN 0 AND 100),
  mastery_level text NOT NULL DEFAULT 'not_assessed'
    CHECK (mastery_level IN ('not_assessed', 'discovering', 'developing', 'acquired', 'mastered')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  teacher_feedback text,
  evaluated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  evaluated_at timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, learner_id),
  UNIQUE (id, organization_id),
  FOREIGN KEY (assessment_id, organization_id)
    REFERENCES public.assessments(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE public.competency_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  result_id uuid NOT NULL,
  competency_id uuid NOT NULL,
  mastery_level text NOT NULL
    CHECK (mastery_level IN ('discovering', 'developing', 'acquired', 'mastered')),
  score_percent numeric(5,2) CHECK (score_percent IS NULL OR score_percent BETWEEN 0 AND 100),
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (result_id, competency_id),
  FOREIGN KEY (result_id, organization_id)
    REFERENCES public.assessment_results(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (competency_id, organization_id)
    REFERENCES public.competencies(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE public.learner_self_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES public.learner_profiles(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL,
  confidence text NOT NULL CHECK (confidence IN ('not_yet', 'almost', 'yes')),
  note text,
  assessed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (learner_id, competency_id),
  FOREIGN KEY (competency_id, organization_id)
    REFERENCES public.competencies(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE public.report_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES public.learner_profiles(id) ON DELETE CASCADE,
  cohort_id uuid NOT NULL,
  period_id uuid,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 160),
  overall_score numeric(5,2) CHECK (overall_score IS NULL OR overall_score BETWEEN 0 AND 100),
  mastery_percent numeric(5,2) CHECK (mastery_percent IS NULL OR mastery_percent BETWEEN 0 AND 100),
  attendance_percent numeric(5,2) CHECK (attendance_percent IS NULL OR attendance_percent BETWEEN 0 AND 100),
  strengths text,
  priorities text,
  teacher_comment text,
  decision text NOT NULL DEFAULT 'continue'
    CHECK (decision IN ('continue', 'advance', 'advance_with_support', 'review_required')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  FOREIGN KEY (cohort_id, organization_id)
    REFERENCES public.cohorts(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (period_id, organization_id)
    REFERENCES public.assessment_periods(id, organization_id) ON DELETE SET NULL (period_id)
);

CREATE TABLE public.report_card_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_card_id uuid NOT NULL,
  competency_id uuid NOT NULL,
  mastery_level text NOT NULL
    CHECK (mastery_level IN ('not_assessed', 'discovering', 'developing', 'acquired', 'mastered')),
  comment text,
  UNIQUE (report_card_id, competency_id),
  FOREIGN KEY (report_card_id, organization_id)
    REFERENCES public.report_cards(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (competency_id, organization_id)
    REFERENCES public.competencies(id, organization_id) ON DELETE CASCADE
);

CREATE INDEX program_levels_program_idx ON public.program_levels (program_id, order_index);
CREATE INDEX competencies_level_idx ON public.competencies (level_id, order_index);
CREATE INDEX assessments_cohort_date_idx ON public.assessments (cohort_id, scheduled_on DESC);
CREATE INDEX assessment_results_learner_idx ON public.assessment_results (learner_id, updated_at DESC);
CREATE INDEX competency_evidence_learner_lookup_idx ON public.competency_evidence (competency_id, result_id);
CREATE INDEX learner_self_assessments_learner_idx ON public.learner_self_assessments (learner_id, assessed_at DESC);
CREATE INDEX report_cards_learner_idx ON public.report_cards (learner_id, created_at DESC);

CREATE OR REPLACE FUNCTION private.can_view_learner_record(p_learner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.learner_profiles AS learner
    WHERE learner.id = p_learner_id
      AND (
        learner.user_id = (SELECT auth.uid())
        OR learner.guardian_user_id = (SELECT auth.uid())
        OR private.can_teach_learner(learner.id)
        OR private.is_platform_administrator()
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_manage_assessment(p_assessment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.assessments AS assessment
    WHERE assessment.id = p_assessment_id
      AND (
        private.can_manage_learning(assessment.organization_id)
        OR private.can_teach_cohort(assessment.cohort_id)
      )
  );
$$;

REVOKE ALL ON FUNCTION private.can_view_learner_record(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_manage_assessment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_view_learner_record(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_assessment(uuid) TO authenticated;

ALTER TABLE public.learning_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competency_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_self_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_card_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.learning_programs, public.program_levels, public.competencies,
  public.lesson_competencies, public.assessment_periods, public.assessments,
  public.assessment_competencies, public.assessment_results, public.competency_evidence,
  public.learner_self_assessments, public.report_cards, public.report_card_items
FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.learning_programs, public.program_levels,
  public.competencies, public.lesson_competencies, public.assessment_periods TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.assessments, public.assessment_competencies,
  public.assessment_results, public.competency_evidence, public.learner_self_assessments,
  public.report_cards, public.report_card_items TO authenticated;

CREATE POLICY learning_programs_read ON public.learning_programs FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id) OR private.is_platform_administrator());
CREATE POLICY learning_programs_manage ON public.learning_programs FOR ALL TO authenticated
  USING (private.can_manage_learning(organization_id) OR private.is_platform_administrator())
  WITH CHECK (private.can_manage_learning(organization_id) OR private.is_platform_administrator());

CREATE POLICY program_levels_read ON public.program_levels FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id) OR private.is_platform_administrator());
CREATE POLICY program_levels_manage ON public.program_levels FOR ALL TO authenticated
  USING (private.can_manage_learning(organization_id) OR private.is_platform_administrator())
  WITH CHECK (private.can_manage_learning(organization_id) OR private.is_platform_administrator());

CREATE POLICY competencies_read ON public.competencies FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id) OR private.is_platform_administrator());
CREATE POLICY competencies_manage ON public.competencies FOR ALL TO authenticated
  USING (private.can_manage_learning(organization_id) OR private.is_platform_administrator())
  WITH CHECK (private.can_manage_learning(organization_id) OR private.is_platform_administrator());

CREATE POLICY lesson_competencies_read ON public.lesson_competencies FOR SELECT TO authenticated
  USING (private.can_access_lesson(lesson_id) OR private.can_manage_learning(organization_id));
CREATE POLICY lesson_competencies_manage ON public.lesson_competencies FOR ALL TO authenticated
  USING (private.can_manage_learning(organization_id))
  WITH CHECK (private.can_manage_learning(organization_id));

CREATE POLICY assessment_periods_read ON public.assessment_periods FOR SELECT TO authenticated
  USING (private.is_organization_member(organization_id) OR private.is_platform_administrator());
CREATE POLICY assessment_periods_manage ON public.assessment_periods FOR ALL TO authenticated
  USING (private.can_manage_learning(organization_id) OR private.is_platform_administrator())
  WITH CHECK (private.can_manage_learning(organization_id) OR private.is_platform_administrator());

CREATE POLICY assessments_read ON public.assessments FOR SELECT TO authenticated
  USING (
    private.can_manage_assessment(id)
    OR (
      status <> 'draft'
      AND EXISTS (
        SELECT 1 FROM public.learner_cohort_memberships membership
        JOIN public.learner_profiles learner ON learner.id = membership.learner_id
        WHERE membership.cohort_id = assessments.cohort_id
          AND membership.status IN ('active', 'completed')
          AND (learner.user_id = (SELECT auth.uid()) OR learner.guardian_user_id = (SELECT auth.uid()))
      )
    )
  );
CREATE POLICY assessments_insert ON public.assessments FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learning(organization_id) OR private.can_teach_cohort(cohort_id));
CREATE POLICY assessments_update ON public.assessments FOR UPDATE TO authenticated
  USING (private.can_manage_assessment(id))
  WITH CHECK (private.can_manage_learning(organization_id) OR private.can_teach_cohort(cohort_id));

CREATE POLICY assessment_competencies_read ON public.assessment_competencies FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id));
CREATE POLICY assessment_competencies_write ON public.assessment_competencies FOR ALL TO authenticated
  USING (private.can_manage_assessment(assessment_id))
  WITH CHECK (private.can_manage_assessment(assessment_id));

CREATE POLICY assessment_results_read ON public.assessment_results FOR SELECT TO authenticated
  USING (private.can_view_learner_record(learner_id) AND (status = 'published' OR private.can_manage_assessment(assessment_id)));
CREATE POLICY assessment_results_insert ON public.assessment_results FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_assessment(assessment_id) AND private.can_teach_learner(learner_id));
CREATE POLICY assessment_results_update ON public.assessment_results FOR UPDATE TO authenticated
  USING (private.can_manage_assessment(assessment_id) AND private.can_teach_learner(learner_id))
  WITH CHECK (private.can_manage_assessment(assessment_id) AND private.can_teach_learner(learner_id));

CREATE POLICY competency_evidence_read ON public.competency_evidence FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessment_results r WHERE r.id = result_id));
CREATE POLICY competency_evidence_write ON public.competency_evidence FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessment_results r WHERE r.id = result_id AND private.can_manage_assessment(r.assessment_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessment_results r WHERE r.id = result_id AND private.can_manage_assessment(r.assessment_id)));

CREATE POLICY learner_self_assessments_read ON public.learner_self_assessments FOR SELECT TO authenticated
  USING (private.can_view_learner_record(learner_id));
CREATE POLICY learner_self_assessments_insert ON public.learner_self_assessments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.learner_profiles learner WHERE learner.id = learner_id AND learner.user_id = (SELECT auth.uid())));
CREATE POLICY learner_self_assessments_update ON public.learner_self_assessments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.learner_profiles learner WHERE learner.id = learner_id AND learner.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.learner_profiles learner WHERE learner.id = learner_id AND learner.user_id = (SELECT auth.uid())));

CREATE POLICY report_cards_read ON public.report_cards FOR SELECT TO authenticated
  USING (private.can_view_learner_record(learner_id) AND (status = 'published' OR private.can_teach_cohort(cohort_id)));
CREATE POLICY report_cards_insert ON public.report_cards FOR INSERT TO authenticated
  WITH CHECK ((private.can_manage_learning(organization_id) OR private.can_teach_cohort(cohort_id)) AND private.can_teach_learner(learner_id));
CREATE POLICY report_cards_update ON public.report_cards FOR UPDATE TO authenticated
  USING (private.can_manage_learning(organization_id) OR private.can_teach_cohort(cohort_id))
  WITH CHECK ((private.can_manage_learning(organization_id) OR private.can_teach_cohort(cohort_id)) AND private.can_teach_learner(learner_id));

CREATE POLICY report_card_items_read ON public.report_card_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.report_cards card WHERE card.id = report_card_id));
CREATE POLICY report_card_items_write ON public.report_card_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.report_cards card WHERE card.id = report_card_id AND (private.can_manage_learning(card.organization_id) OR private.can_teach_cohort(card.cohort_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.report_cards card WHERE card.id = report_card_id AND (private.can_manage_learning(card.organization_id) OR private.can_teach_cohort(card.cohort_id))));
