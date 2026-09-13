BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(26);

SELECT row_security_is('public', 'learning_programs', 'RLS protects learning programs');
SELECT row_security_is('public', 'program_levels', 'RLS protects program levels');
SELECT row_security_is('public', 'competencies', 'RLS protects competencies');
SELECT row_security_is('public', 'lesson_competencies', 'RLS protects lesson competency links');
SELECT row_security_is('public', 'assessment_periods', 'RLS protects assessment periods');
SELECT row_security_is('public', 'assessments', 'RLS protects assessments');
SELECT row_security_is('public', 'assessment_competencies', 'RLS protects assessment competency links');
SELECT row_security_is('public', 'assessment_results', 'RLS protects learner results');
SELECT row_security_is('public', 'competency_evidence', 'RLS protects competency evidence');
SELECT row_security_is('public', 'learner_self_assessments', 'RLS protects learner self-assessments');
SELECT row_security_is('public', 'report_cards', 'RLS protects report cards');
SELECT row_security_is('public', 'report_card_items', 'RLS protects report card items');

SELECT ok(NOT has_table_privilege('anon', 'public.learning_programs', 'SELECT'), 'Anonymous users cannot read learning programs');
SELECT ok(NOT has_table_privilege('anon', 'public.program_levels', 'SELECT'), 'Anonymous users cannot read program levels');
SELECT ok(NOT has_table_privilege('anon', 'public.competencies', 'SELECT'), 'Anonymous users cannot read competencies');
SELECT ok(NOT has_table_privilege('anon', 'public.lesson_competencies', 'SELECT'), 'Anonymous users cannot read lesson competency links');
SELECT ok(NOT has_table_privilege('anon', 'public.assessment_periods', 'SELECT'), 'Anonymous users cannot read assessment periods');
SELECT ok(NOT has_table_privilege('anon', 'public.assessments', 'SELECT'), 'Anonymous users cannot read assessments');
SELECT ok(NOT has_table_privilege('anon', 'public.assessment_competencies', 'SELECT'), 'Anonymous users cannot read assessment competency links');
SELECT ok(NOT has_table_privilege('anon', 'public.assessment_results', 'SELECT'), 'Anonymous users cannot read learner results');
SELECT ok(NOT has_table_privilege('anon', 'public.competency_evidence', 'SELECT'), 'Anonymous users cannot read competency evidence');
SELECT ok(NOT has_table_privilege('anon', 'public.learner_self_assessments', 'SELECT'), 'Anonymous users cannot read learner self-assessments');
SELECT ok(NOT has_table_privilege('anon', 'public.report_cards', 'SELECT'), 'Anonymous users cannot read report cards');
SELECT ok(NOT has_table_privilege('anon', 'public.report_card_items', 'SELECT'), 'Anonymous users cannot read report card items');

SELECT is(
  (SELECT count(*)::integer FROM pg_policies WHERE schemaname = 'public' AND tablename IN (
    'learning_programs', 'program_levels', 'competencies', 'lesson_competencies',
    'assessment_periods', 'assessments', 'assessment_competencies', 'assessment_results',
    'competency_evidence', 'learner_self_assessments', 'report_cards', 'report_card_items'
  ) AND cmd = 'ALL'),
  0,
  'Evaluation tables avoid overlapping FOR ALL policies'
);

SELECT is(
  (SELECT count(DISTINCT tablename)::integer FROM pg_policies WHERE schemaname = 'public' AND tablename IN (
    'learning_programs', 'program_levels', 'competencies', 'lesson_competencies',
    'assessment_periods', 'assessments', 'assessment_competencies', 'assessment_results',
    'competency_evidence', 'learner_self_assessments', 'report_cards', 'report_card_items'
  ) AND cmd = 'SELECT'),
  12,
  'Every evaluation table has a dedicated SELECT policy'
);

SELECT * FROM finish();
ROLLBACK;
