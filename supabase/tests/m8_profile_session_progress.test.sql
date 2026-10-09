-- Run after M8 inside the same transaction as the migration.

DO $$
DECLARE checks integer := 0;
BEGIN
  IF to_regclass('public.profile_session_progress') IS NULL THEN RAISE EXCEPTION 'M8-I01 table missing'; END IF; checks := checks + 1;
  IF (SELECT count(*) FROM public.profile_session_progress) <> (SELECT count(*) FROM public.progress) THEN RAISE EXCEPTION 'M8-I02 legacy count mismatch'; END IF; checks := checks + 1;
  IF EXISTS (SELECT 1 FROM public.progress p LEFT JOIN public.profile_session_progress c ON c.id=p.id WHERE c.id IS NULL) THEN RAISE EXCEPTION 'M8-I03 legacy row missing'; END IF; checks := checks + 1;
  IF EXISTS (SELECT 1 FROM public.progress p JOIN public.profile_session_progress c ON c.id=p.id JOIN public.sessions s ON s.id=c.session_id WHERE c.profile_id IS DISTINCT FROM p.user_id OR s.lesson_id IS DISTINCT FROM p.lesson_id OR c.status IS DISTINCT FROM p.status) THEN RAISE EXCEPTION 'M8-I04 legacy mapping changed'; END IF; checks := checks + 1;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.profile_session_progress'::regclass AND contype='u' AND conname='profile_session_progress_profile_session_key') THEN RAISE EXCEPTION 'M8-I05 unique constraint missing'; END IF; checks := checks + 1;
  IF (SELECT count(*) FROM pg_constraint WHERE conrelid='public.profile_session_progress'::regclass AND contype='f') <> 4 THEN RAISE EXCEPTION 'M8-I06 FK count'; END IF; checks := checks + 1;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.profile_session_progress'::regclass) THEN RAISE EXCEPTION 'M8-I07 RLS disabled'; END IF; checks := checks + 1;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='profile_session_progress') <> 3 THEN RAISE EXCEPTION 'M8-I08 policy count'; END IF; checks := checks + 1;
  IF has_table_privilege('anon','public.profile_session_progress','SELECT') OR has_table_privilege('anon','public.profile_session_progress','INSERT') OR has_table_privilege('anon','public.profile_session_progress','UPDATE') THEN RAISE EXCEPTION 'M8-I09 anon grant'; END IF; checks := checks + 1;
  IF NOT has_table_privilege('authenticated','public.profile_session_progress','SELECT') OR NOT has_table_privilege('authenticated','public.profile_session_progress','INSERT') OR NOT has_table_privilege('authenticated','public.profile_session_progress','UPDATE') OR has_table_privilege('authenticated','public.profile_session_progress','DELETE') THEN RAISE EXCEPTION 'M8-I10 authenticated grants'; END IF; checks := checks + 1;
  IF has_function_privilege('public','private.m8_guard_profile_session_progress()','EXECUTE') OR has_function_privilege('anon','private.m8_guard_profile_session_progress()','EXECUTE') OR has_function_privilege('authenticated','private.m8_guard_profile_session_progress()','EXECUTE') THEN RAISE EXCEPTION 'M8-I11 guard exposed'; END IF; checks := checks + 1;
  IF has_function_privilege('public','private.m8_required_activities_complete(uuid,uuid)','EXECUTE') OR has_function_privilege('anon','private.m8_required_activities_complete(uuid,uuid)','EXECUTE') OR has_function_privilege('authenticated','private.m8_required_activities_complete(uuid,uuid)','EXECUTE') THEN RAISE EXCEPTION 'M8-I12 completion helper exposed'; END IF; checks := checks + 1;
  IF has_function_privilege('public','private.can_validate_profile_session(uuid,uuid)','EXECUTE') OR has_function_privilege('anon','private.can_validate_profile_session(uuid,uuid)','EXECUTE') OR NOT has_function_privilege('authenticated','private.can_validate_profile_session(uuid,uuid)','EXECUTE') THEN RAISE EXCEPTION 'M8-I13 validation helper grants'; END IF; checks := checks + 1;
  IF EXISTS (SELECT 1 FROM public.profile_session_progress c JOIN public.profiles p ON p.id=c.profile_id JOIN public.sessions s ON s.id=c.session_id WHERE c.organization_id IS DISTINCT FROM p.organization_id OR c.organization_id IS DISTINCT FROM s.organization_id) THEN RAISE EXCEPTION 'M8-I14 cross-org row'; END IF; checks := checks + 1;
  IF EXISTS (SELECT 1 FROM public.profile_session_progress WHERE status='completed' AND (completed_at IS NULL OR completed_version IS NULL OR validated_at IS NOT NULL OR validated_by IS NOT NULL)) THEN RAISE EXCEPTION 'M8-I15 completed state invalid'; END IF; checks := checks + 1;
  IF (SELECT count(*) FROM public.profiles) <> 2 OR (SELECT count(*) FROM auth.users) <> 2 OR (SELECT count(*) FROM public.organization_memberships) <> 2 THEN RAISE EXCEPTION 'M8-I16 identity changed'; END IF; checks := checks + 1;
  IF (SELECT count(*) FROM public.sessions) <> 10 OR (SELECT count(*) FROM public.activities) <> 3 OR (SELECT count(*) FROM public.lesson_resources) <> 14 THEN RAISE EXCEPTION 'M8-I17 M6/M7 data changed'; END IF; checks := checks + 1;
  IF (SELECT count(*) FROM public.progress) <> 1 THEN RAISE EXCEPTION 'M8-I18 legacy progress changed'; END IF; checks := checks + 1;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE slug='diakspora' AND feature_flags->>'progress_v1'='false') THEN RAISE EXCEPTION 'M8-I19 flag must start false'; END IF; checks := checks + 1;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.profile_session_progress'::regclass AND tgname='m8_guard_profile_session_progress' AND NOT tgisinternal) THEN RAISE EXCEPTION 'M8-I20 guard trigger missing'; END IF; checks := checks + 1;
  IF checks <> 20 THEN RAISE EXCEPTION 'M8 integrity harness count invalid'; END IF;
END
$$;

-- Transaction-only identities and family/class fixtures.
INSERT INTO auth.users (instance_id,id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
VALUES
('00000000-0000-0000-0000-000000000000','80000000-0000-4000-8000-000000000001','authenticated','authenticated','m8-teacher@example.test','','{}','{"full_name":"M8 Teacher"}',now(),now()),
('00000000-0000-0000-0000-000000000000','80000000-0000-4000-8000-000000000002','authenticated','authenticated','m8-parent-a@example.test','','{}','{"full_name":"M8 Parent A"}',now(),now()),
('00000000-0000-0000-0000-000000000000','80000000-0000-4000-8000-000000000003','authenticated','authenticated','m8-parent-b@example.test','','{}','{"full_name":"M8 Parent B"}',now(),now());

UPDATE public.profiles
SET organization_id='390a6abd-8712-490c-8f8d-846165bf9f9f', profile_type='adult', status='active'
WHERE id IN ('80000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000003');

INSERT INTO public.organization_memberships (organization_id,user_id,role,status,is_default)
VALUES
('390a6abd-8712-490c-8f8d-846165bf9f9f','80000000-0000-4000-8000-000000000001','teacher','active',true),
('390a6abd-8712-490c-8f8d-846165bf9f9f','80000000-0000-4000-8000-000000000002','parent','active',true),
('390a6abd-8712-490c-8f8d-846165bf9f9f','80000000-0000-4000-8000-000000000003','parent','active',true);

INSERT INTO public.profiles (id,organization_id,profile_type,full_name,status,created_by)
VALUES ('81000000-0000-4000-8000-000000000002','390a6abd-8712-490c-8f8d-846165bf9f9f','child','M8 Child B','active','80000000-0000-4000-8000-000000000003');
INSERT INTO public.learner_profiles (id,organization_id,guardian_user_id,full_name,access_mode,status,profile_id,created_by)
VALUES ('82000000-0000-4000-8000-000000000002','390a6abd-8712-490c-8f8d-846165bf9f9f','80000000-0000-4000-8000-000000000003','M8 Child B','guardian_managed','active','81000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000003');

INSERT INTO public.family_relationships (organization_id,parent_user_id,learner_user_id,parent_profile_id,child_profile_id,relationship,status,created_by)
VALUES
('390a6abd-8712-490c-8f8d-846165bf9f9f','80000000-0000-4000-8000-000000000002','777cbdea-7c2c-430d-872f-26fa2d6e9088','80000000-0000-4000-8000-000000000002','777cbdea-7c2c-430d-872f-26fa2d6e9088','guardian','active','80000000-0000-4000-8000-000000000002'),
('390a6abd-8712-490c-8f8d-846165bf9f9f','80000000-0000-4000-8000-000000000003',NULL,'80000000-0000-4000-8000-000000000003','81000000-0000-4000-8000-000000000002','guardian','active','80000000-0000-4000-8000-000000000003');

INSERT INTO public.cohort_memberships (organization_id,cohort_id,user_id,role,status)
VALUES ('390a6abd-8712-490c-8f8d-846165bf9f9f','1d62cc77-1832-4a77-9d47-daf62dc03939','80000000-0000-4000-8000-000000000001','teacher','active');
INSERT INTO public.cohorts (id,name,organization_id,status)
VALUES ('83000000-0000-4000-8000-000000000002','M8 Other Class','390a6abd-8712-490c-8f8d-846165bf9f9f','active');
INSERT INTO public.learner_cohort_memberships (organization_id,cohort_id,learner_id,profile_id,status,created_by)
VALUES ('390a6abd-8712-490c-8f8d-846165bf9f9f','83000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002','81000000-0000-4000-8000-000000000002','active','80000000-0000-4000-8000-000000000003');
INSERT INTO public.course_cohorts (organization_id,course_id,cohort_id,assigned_by)
VALUES ('390a6abd-8712-490c-8f8d-846165bf9f9f','e3572c9c-2046-4620-a3f6-f0113dee8097','83000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000003');

-- Learner: not_started -> in_progress -> completed.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','777cbdea-7c2c-430d-872f-26fa2d6e9088',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
INSERT INTO public.profile_session_progress (organization_id,profile_id,session_id)
VALUES ('390a6abd-8712-490c-8f8d-846165bf9f9f','777cbdea-7c2c-430d-872f-26fa2d6e9088','3a4023ae-8833-428c-ab39-29ac8ec389e5');
UPDATE public.profile_session_progress SET status='completed'
WHERE profile_id='777cbdea-7c2c-430d-872f-26fa2d6e9088' AND session_id='3a4023ae-8833-428c-ab39-29ac8ec389e5';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profile_session_progress WHERE profile_id='777cbdea-7c2c-430d-872f-26fa2d6e9088' AND session_id='3a4023ae-8833-428c-ab39-29ac8ec389e5' AND status='completed' AND completed_version=1) THEN RAISE EXCEPTION 'M8-RLS-01 learner completion failed'; END IF;
END $$;

-- Learner cannot self-validate a legacy completed session.
DO $$ DECLARE caught boolean := false; BEGIN
  BEGIN
    UPDATE public.profile_session_progress SET status='validated'
    WHERE id='2645b365-a4ad-4662-995a-5327e0d4dcd0';
  EXCEPTION WHEN insufficient_privilege THEN caught := true;
  END;
  IF NOT caught THEN RAISE EXCEPTION 'M8-RLS-02 learner self-validation was not rejected'; END IF;
END $$;
RESET ROLE;

-- Parent A can start Child A, but cannot see Child B.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
INSERT INTO public.profile_session_progress (organization_id,profile_id,session_id)
VALUES ('390a6abd-8712-490c-8f8d-846165bf9f9f','777cbdea-7c2c-430d-872f-26fa2d6e9088','4ef070c5-cd3f-4a10-b74b-9d0a9fe19b21');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profile_session_progress WHERE profile_id='777cbdea-7c2c-430d-872f-26fa2d6e9088' AND session_id='4ef070c5-cd3f-4a10-b74b-9d0a9fe19b21') THEN RAISE EXCEPTION 'M8-RLS-03 parent child access failed'; END IF;
END $$;
RESET ROLE;

-- Parent B completes the required activity and Child B session in another class.
-- The attempt is a transaction-only prerequisite fixture; application M7 RLS is
-- deliberately left unchanged by M8.
INSERT INTO public.activity_attempts (organization_id,activity_id,profile_id,user_id,status,completed_at,self_evaluation)
VALUES ('390a6abd-8712-490c-8f8d-846165bf9f9f','14e28945-3bc3-4196-8913-8aa9267b4c1f','81000000-0000-4000-8000-000000000002','80000000-0000-4000-8000-000000000003','completed',now(),'understood');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000003',true);
INSERT INTO public.profile_session_progress (organization_id,profile_id,session_id)
VALUES ('390a6abd-8712-490c-8f8d-846165bf9f9f','81000000-0000-4000-8000-000000000002','3f85fd86-8700-4a23-b830-461e32c99a76');
UPDATE public.profile_session_progress SET status='completed'
WHERE profile_id='81000000-0000-4000-8000-000000000002' AND session_id='3f85fd86-8700-4a23-b830-461e32c99a76';
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.profile_session_progress WHERE profile_id='81000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'M8-RLS-04 cross-family read granted'; END IF;
END $$;
RESET ROLE;

-- Assigned teacher validates Child A only.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000001',true);
UPDATE public.profile_session_progress SET status='validated'
WHERE id='2645b365-a4ad-4662-995a-5327e0d4dcd0';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profile_session_progress WHERE id='2645b365-a4ad-4662-995a-5327e0d4dcd0' AND status='validated' AND validated_by='80000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'M8-RLS-05 teacher validation failed'; END IF;
END $$;
UPDATE public.profile_session_progress SET status='validated'
WHERE profile_id='81000000-0000-4000-8000-000000000002';
RESET ROLE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.profile_session_progress WHERE profile_id='81000000-0000-4000-8000-000000000002' AND status='validated') THEN RAISE EXCEPTION 'M8-RLS-06 cross-class validation granted'; END IF;
END $$;

-- Completion remains attached to the version completed by the learner.
UPDATE public.sessions SET version=2 WHERE id='3a4023ae-8833-428c-ab39-29ac8ec389e5';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profile_session_progress WHERE profile_id='777cbdea-7c2c-430d-872f-26fa2d6e9088' AND session_id='3a4023ae-8833-428c-ab39-29ac8ec389e5' AND status='completed' AND completed_version=1) THEN RAISE EXCEPTION 'M8-RLS-07 completion version was reset'; END IF;
END $$;

-- Sensitivity: temporarily make every row visible; the negative family probe must turn red.
CREATE POLICY m8_sensitivity_intentionally_overbroad
ON public.profile_session_progress FOR SELECT TO authenticated USING (true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profile_session_progress WHERE profile_id='81000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'M8 sensitivity did not detect the neutralized family boundary'; END IF;
END $$;
RESET ROLE;
DROP POLICY m8_sensitivity_intentionally_overbroad ON public.profile_session_progress;
