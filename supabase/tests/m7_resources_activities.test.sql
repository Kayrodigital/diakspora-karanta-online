-- Run after M7 inside the same transaction as the migration.

DO $$
DECLARE
  checks integer := 0;
BEGIN
  IF (SELECT count(*) FROM public.lesson_resources) <> 14 THEN RAISE EXCEPTION 'M7-I01 resources changed'; END IF; checks := checks + 1;
  IF (SELECT count(*) FROM public.quizzes) <> 3 THEN RAISE EXCEPTION 'M7-I02 quizzes changed'; END IF; checks := checks + 1;
  IF (SELECT count(*) FROM public.homework_submissions) <> 0 THEN RAISE EXCEPTION 'M7-I03 homework changed'; END IF; checks := checks + 1;
  IF (SELECT count(*) FROM public.activities WHERE activity_type='quiz') <> 3 THEN RAISE EXCEPTION 'M7-I04 quiz activities incomplete'; END IF; checks := checks + 1;
  IF EXISTS (SELECT 1 FROM public.lesson_resources WHERE session_id IS NULL) THEN RAISE EXCEPTION 'M7-I05 resource without session'; END IF; checks := checks + 1;
  IF EXISTS (
    SELECT 1 FROM public.lesson_resources r JOIN public.sessions s ON s.id=r.session_id
    WHERE r.lesson_id IS DISTINCT FROM s.lesson_id OR r.organization_id IS DISTINCT FROM s.organization_id
  ) THEN RAISE EXCEPTION 'M7-I06 resource mapping incorrect'; END IF; checks := checks + 1;
  IF EXISTS (SELECT session_id,order_index FROM public.lesson_resources GROUP BY 1,2 HAVING count(*)>1) THEN RAISE EXCEPTION 'M7-I07 duplicate resource order'; END IF; checks := checks + 1;
  IF EXISTS (SELECT 1 FROM public.lesson_resources WHERE access_tier IS NOT NULL OR distribution_authorized IS NOT NULL OR license_type IS NOT NULL) THEN RAISE EXCEPTION 'M7-I08 rights metadata invented'; END IF; checks := checks + 1;
  IF EXISTS (SELECT 1 FROM public.lesson_resources WHERE version <> 1) THEN RAISE EXCEPTION 'M7-I09 resource version invalid'; END IF; checks := checks + 1;
  IF EXISTS (SELECT 1 FROM public.quizzes WHERE activity_id IS NULL) THEN RAISE EXCEPTION 'M7-I10 quiz activity missing'; END IF; checks := checks + 1;
  IF EXISTS (
    SELECT 1 FROM public.quizzes q JOIN public.activities a ON a.id=q.activity_id JOIN public.sessions s ON s.id=a.session_id
    WHERE a.id IS DISTINCT FROM q.id OR a.legacy_quiz_id IS DISTINCT FROM q.id OR s.lesson_id IS DISTINCT FROM q.lesson_id
       OR a.organization_id IS DISTINCT FROM q.organization_id OR a.correction_mode <> 'automatic'
  ) THEN RAISE EXCEPTION 'M7-I11 quiz mapping incorrect'; END IF; checks := checks + 1;
  IF EXISTS (SELECT activity_id FROM public.quizzes GROUP BY 1 HAVING count(*)>1) THEN RAISE EXCEPTION 'M7-I12 duplicate quiz activity'; END IF; checks := checks + 1;
  IF (SELECT count(*) FROM public.quiz_questions) <> 12 OR (SELECT count(*) FROM public.quiz_options) <> 34 OR (SELECT count(*) FROM public.quiz_attempts) <> 1 THEN RAISE EXCEPTION 'M7-I13 quiz engine data changed'; END IF; checks := checks + 1;
  IF (SELECT count(*) FROM public.profiles) <> 2 OR (SELECT count(*) FROM auth.users) <> 2 OR (SELECT count(*) FROM public.organization_memberships) <> 2 THEN RAISE EXCEPTION 'M7-I14 identity changed'; END IF; checks := checks + 1;
  IF (SELECT count(*) FROM public.lessons) <> 10 OR (SELECT count(*) FROM public.sessions) <> 10 THEN RAISE EXCEPTION 'M7-I15 M6 pedagogy changed'; END IF; checks := checks + 1;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='lesson_resources' AND column_name='lesson_id') THEN RAISE EXCEPTION 'M7-I16 legacy resource link removed'; END IF; checks := checks + 1;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='homework_submissions' AND column_name='lesson_id') THEN RAISE EXCEPTION 'M7-I17 legacy homework link removed'; END IF; checks := checks + 1;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quizzes' AND column_name='lesson_id') THEN RAISE EXCEPTION 'M7-I18 legacy quiz link removed'; END IF; checks := checks + 1;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.lesson_resources'::regclass AND conname='lesson_resources_session_same_organization') THEN RAISE EXCEPTION 'M7-I19 resource org FK missing'; END IF; checks := checks + 1;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.activity_attempts'::regclass AND conname='activity_attempts_state_check') THEN RAISE EXCEPTION 'M7-I20 attempt state check missing'; END IF; checks := checks + 1;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.activities'::regclass) OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.activity_attempts'::regclass) THEN RAISE EXCEPTION 'M7-I21 RLS missing'; END IF; checks := checks + 1;
  IF has_table_privilege('anon','public.activity_attempts','SELECT') OR has_table_privilege('anon','public.activity_attempts','INSERT') THEN RAISE EXCEPTION 'M7-I22 anonymous attempt grant'; END IF; checks := checks + 1;
  IF has_function_privilege('public','private.bridge_quiz_activity()','EXECUTE') OR has_function_privilege('anon','private.bridge_quiz_activity()','EXECUTE') OR has_function_privilege('authenticated','private.bridge_quiz_activity()','EXECUTE') THEN RAISE EXCEPTION 'M7-I23 trigger function exposed'; END IF; checks := checks + 1;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='private' AND p.proname='bridge_quiz_activity' AND p.prosecdef AND p.proconfig @> ARRAY['search_path=""']
  ) THEN RAISE EXCEPTION 'M7-I24 private helper hardening'; END IF; checks := checks + 1;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE slug='diakspora' AND feature_flags->>'activities_v1'='false') THEN RAISE EXCEPTION 'M7-I25 flag must start false'; END IF; checks := checks + 1;
  IF EXISTS (SELECT 1 FROM public.activities a JOIN public.sessions s ON s.id=a.session_id WHERE a.organization_id IS DISTINCT FROM s.organization_id) THEN RAISE EXCEPTION 'M7-I26 cross-org activity'; END IF; checks := checks + 1;
  IF checks <> 26 THEN RAISE EXCEPTION 'M7 integrity harness count invalid'; END IF;
END
$$;

-- RLS fixtures live only for the surrounding dry-run transaction.
UPDATE public.lesson_resources
SET access_tier='free', distribution_authorized=true, published_at=now()
WHERE id='0de5b1a7-f6ef-40ba-bb52-a2c23889f7ba';

-- RLS-01: a public, explicitly distributable free resource is visible.
SET LOCAL ROLE anon;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.lesson_resources WHERE id='0de5b1a7-f6ef-40ba-bb52-a2c23889f7ba') THEN
    RAISE EXCEPTION 'M7-RLS-01 public free resource hidden';
  END IF;
END $$;
RESET ROLE;

-- RLS-02/03: authenticated learner sees its published scope, but not premium.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','777cbdea-7c2c-430d-872f-26fa2d6e9088',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.activities WHERE status='published') <> 2 THEN
    RAISE EXCEPTION 'M7-RLS-02 learner activities inaccessible';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lesson_resources WHERE id='0de5b1a7-f6ef-40ba-bb52-a2c23889f7ba') THEN
    RAISE EXCEPTION 'M7-RLS-03 learner resource inaccessible';
  END IF;
END $$;
RESET ROLE;

UPDATE public.lesson_resources SET access_tier='premium'
WHERE id='0de5b1a7-f6ef-40ba-bb52-a2c23889f7ba';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','777cbdea-7c2c-430d-872f-26fa2d6e9088',true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.lesson_resources WHERE id='0de5b1a7-f6ef-40ba-bb52-a2c23889f7ba') THEN
    RAISE EXCEPTION 'M7-RLS-04 premium resource exposed without entitlement';
  END IF;
END $$;
RESET ROLE;

-- RLS-05/06: correction hidden before completion and visible afterwards.
UPDATE public.lesson_resources
SET access_tier='free', correction_activity_id='9ed350e3-c128-40d9-a291-4c9bb20cf867'
WHERE id='0de5b1a7-f6ef-40ba-bb52-a2c23889f7ba';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','777cbdea-7c2c-430d-872f-26fa2d6e9088',true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.lesson_resources WHERE id='0de5b1a7-f6ef-40ba-bb52-a2c23889f7ba') THEN
    RAISE EXCEPTION 'M7-RLS-05 correction visible before completion';
  END IF;
END $$;
INSERT INTO public.activity_attempts (
  organization_id,activity_id,profile_id,user_id,status,completed_at,self_evaluation
) VALUES (
  '390a6abd-8712-490c-8f8d-846165bf9f9f',
  '9ed350e3-c128-40d9-a291-4c9bb20cf867',
  '777cbdea-7c2c-430d-872f-26fa2d6e9088','777cbdea-7c2c-430d-872f-26fa2d6e9088',
  'completed',now(),'understood'
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.lesson_resources WHERE id='0de5b1a7-f6ef-40ba-bb52-a2c23889f7ba') THEN
    RAISE EXCEPTION 'M7-RLS-06 correction hidden after completion';
  END IF;
  IF (SELECT count(*) FROM public.activity_attempts) <> 1 THEN
    RAISE EXCEPTION 'M7-RLS-07 own attempt inaccessible';
  END IF;
END $$;
RESET ROLE;

-- RLS-08: another user cannot mutate the learner attempt.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000777',true);
UPDATE public.activity_attempts SET status='in_progress',completed_at=NULL
WHERE profile_id='777cbdea-7c2c-430d-872f-26fa2d6e9088';
RESET ROLE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.activity_attempts WHERE status <> 'completed') THEN
    RAISE EXCEPTION 'M7-RLS-08 cross-profile mutation';
  END IF;
END $$;

-- Sensitivity: the deliberately false negative assertion must turn red.
DO $$
DECLARE caught boolean := false;
BEGIN
  BEGIN
    IF EXISTS (SELECT 1 FROM public.activities WHERE status='published') THEN
      RAISE EXCEPTION 'EXPECTED_RED: published activities deliberately treated as forbidden';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'EXPECTED_RED:%' THEN caught := true; ELSE RAISE; END IF;
  END;
  IF NOT caught THEN RAISE EXCEPTION 'M7 sensitivity harness did not become red'; END IF;
END
$$;
