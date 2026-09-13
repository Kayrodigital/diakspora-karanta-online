-- Remove overlapping SELECT policies created by FOR ALL and add covering
-- indexes for every foreign-key path used by the evaluation module.

DROP POLICY learning_programs_manage ON public.learning_programs;
CREATE POLICY learning_programs_insert ON public.learning_programs FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learning(organization_id) OR private.is_platform_administrator());
CREATE POLICY learning_programs_update ON public.learning_programs FOR UPDATE TO authenticated
  USING (private.can_manage_learning(organization_id) OR private.is_platform_administrator())
  WITH CHECK (private.can_manage_learning(organization_id) OR private.is_platform_administrator());
CREATE POLICY learning_programs_delete ON public.learning_programs FOR DELETE TO authenticated
  USING (private.can_manage_learning(organization_id) OR private.is_platform_administrator());

DROP POLICY program_levels_manage ON public.program_levels;
CREATE POLICY program_levels_insert ON public.program_levels FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learning(organization_id) OR private.is_platform_administrator());
CREATE POLICY program_levels_update ON public.program_levels FOR UPDATE TO authenticated
  USING (private.can_manage_learning(organization_id) OR private.is_platform_administrator())
  WITH CHECK (private.can_manage_learning(organization_id) OR private.is_platform_administrator());
CREATE POLICY program_levels_delete ON public.program_levels FOR DELETE TO authenticated
  USING (private.can_manage_learning(organization_id) OR private.is_platform_administrator());

DROP POLICY competencies_manage ON public.competencies;
CREATE POLICY competencies_insert ON public.competencies FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learning(organization_id) OR private.is_platform_administrator());
CREATE POLICY competencies_update ON public.competencies FOR UPDATE TO authenticated
  USING (private.can_manage_learning(organization_id) OR private.is_platform_administrator())
  WITH CHECK (private.can_manage_learning(organization_id) OR private.is_platform_administrator());
CREATE POLICY competencies_delete ON public.competencies FOR DELETE TO authenticated
  USING (private.can_manage_learning(organization_id) OR private.is_platform_administrator());

DROP POLICY lesson_competencies_manage ON public.lesson_competencies;
CREATE POLICY lesson_competencies_insert ON public.lesson_competencies FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY lesson_competencies_update ON public.lesson_competencies FOR UPDATE TO authenticated
  USING (private.can_manage_learning(organization_id))
  WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY lesson_competencies_delete ON public.lesson_competencies FOR DELETE TO authenticated
  USING (private.can_manage_learning(organization_id));

DROP POLICY assessment_periods_manage ON public.assessment_periods;
CREATE POLICY assessment_periods_insert ON public.assessment_periods FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learning(organization_id) OR private.is_platform_administrator());
CREATE POLICY assessment_periods_update ON public.assessment_periods FOR UPDATE TO authenticated
  USING (private.can_manage_learning(organization_id) OR private.is_platform_administrator())
  WITH CHECK (private.can_manage_learning(organization_id) OR private.is_platform_administrator());
CREATE POLICY assessment_periods_delete ON public.assessment_periods FOR DELETE TO authenticated
  USING (private.can_manage_learning(organization_id) OR private.is_platform_administrator());

DROP POLICY assessment_competencies_write ON public.assessment_competencies;
CREATE POLICY assessment_competencies_insert ON public.assessment_competencies FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_assessment(assessment_id));
CREATE POLICY assessment_competencies_update ON public.assessment_competencies FOR UPDATE TO authenticated
  USING (private.can_manage_assessment(assessment_id))
  WITH CHECK (private.can_manage_assessment(assessment_id));

DROP POLICY competency_evidence_write ON public.competency_evidence;
CREATE POLICY competency_evidence_insert ON public.competency_evidence FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessment_results r WHERE r.id = result_id AND private.can_manage_assessment(r.assessment_id)));
CREATE POLICY competency_evidence_update ON public.competency_evidence FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessment_results r WHERE r.id = result_id AND private.can_manage_assessment(r.assessment_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assessment_results r WHERE r.id = result_id AND private.can_manage_assessment(r.assessment_id)));

DROP POLICY report_card_items_write ON public.report_card_items;
CREATE POLICY report_card_items_insert ON public.report_card_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.report_cards card WHERE card.id = report_card_id AND (private.can_manage_learning(card.organization_id) OR private.can_teach_cohort(card.cohort_id))));
CREATE POLICY report_card_items_update ON public.report_card_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.report_cards card WHERE card.id = report_card_id AND (private.can_manage_learning(card.organization_id) OR private.can_teach_cohort(card.cohort_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.report_cards card WHERE card.id = report_card_id AND (private.can_manage_learning(card.organization_id) OR private.can_teach_cohort(card.cohort_id))));

CREATE INDEX learning_programs_organization_idx ON public.learning_programs (organization_id);
CREATE INDEX learning_programs_created_by_idx ON public.learning_programs (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX program_levels_organization_idx ON public.program_levels (organization_id);
CREATE INDEX program_levels_program_organization_idx ON public.program_levels (program_id, organization_id);
CREATE INDEX competencies_organization_idx ON public.competencies (organization_id);
CREATE INDEX competencies_level_organization_idx ON public.competencies (level_id, organization_id);
CREATE INDEX lesson_competencies_organization_idx ON public.lesson_competencies (organization_id);
CREATE INDEX lesson_competencies_lesson_organization_idx ON public.lesson_competencies (lesson_id, organization_id);
CREATE INDEX lesson_competencies_competency_organization_idx ON public.lesson_competencies (competency_id, organization_id);
CREATE INDEX assessment_periods_organization_idx ON public.assessment_periods (organization_id);
CREATE INDEX assessments_organization_idx ON public.assessments (organization_id);
CREATE INDEX assessments_cohort_organization_idx ON public.assessments (cohort_id, organization_id);
CREATE INDEX assessments_course_organization_idx ON public.assessments (course_id, organization_id) WHERE course_id IS NOT NULL;
CREATE INDEX assessments_lesson_organization_idx ON public.assessments (lesson_id, organization_id) WHERE lesson_id IS NOT NULL;
CREATE INDEX assessments_period_organization_idx ON public.assessments (period_id, organization_id) WHERE period_id IS NOT NULL;
CREATE INDEX assessments_created_by_idx ON public.assessments (created_by);
CREATE INDEX assessment_competencies_organization_idx ON public.assessment_competencies (organization_id);
CREATE INDEX assessment_competencies_assessment_organization_idx ON public.assessment_competencies (assessment_id, organization_id);
CREATE INDEX assessment_competencies_competency_organization_idx ON public.assessment_competencies (competency_id, organization_id);
CREATE INDEX assessment_results_organization_idx ON public.assessment_results (organization_id);
CREATE INDEX assessment_results_assessment_organization_idx ON public.assessment_results (assessment_id, organization_id);
CREATE INDEX assessment_results_evaluated_by_idx ON public.assessment_results (evaluated_by) WHERE evaluated_by IS NOT NULL;
CREATE INDEX competency_evidence_organization_idx ON public.competency_evidence (organization_id);
CREATE INDEX competency_evidence_result_organization_idx ON public.competency_evidence (result_id, organization_id);
CREATE INDEX competency_evidence_competency_organization_idx ON public.competency_evidence (competency_id, organization_id);
CREATE INDEX learner_self_assessments_organization_idx ON public.learner_self_assessments (organization_id);
CREATE INDEX learner_self_assessments_competency_organization_idx ON public.learner_self_assessments (competency_id, organization_id);
CREATE INDEX report_cards_organization_idx ON public.report_cards (organization_id);
CREATE INDEX report_cards_cohort_organization_idx ON public.report_cards (cohort_id, organization_id);
CREATE INDEX report_cards_period_organization_idx ON public.report_cards (period_id, organization_id) WHERE period_id IS NOT NULL;
CREATE INDEX report_cards_created_by_idx ON public.report_cards (created_by);
CREATE INDEX report_card_items_organization_idx ON public.report_card_items (organization_id);
CREATE INDEX report_card_items_report_organization_idx ON public.report_card_items (report_card_id, organization_id);
CREATE INDEX report_card_items_competency_organization_idx ON public.report_card_items (competency_id, organization_id);
