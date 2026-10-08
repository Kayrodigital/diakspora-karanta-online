-- Run only after 20261008235408_m5_profile_identity_cutover.sql, in the same transaction.
-- Karanta production fixture IDs are intentional: this suite validates the real M4 bridges.

DO $$
DECLARE
  org_id constant uuid := '390a6abd-8712-490c-8f8d-846165bf9f9f';
  actor_id constant uuid := '777cbdea-7c2c-430d-872f-26fa2d6e9088';
  linked_profile_id constant uuid := '7dffded4-9741-4692-b593-216cc1f4e609';
  other_profile_id constant uuid := '00000000-0000-4000-8000-0000000005b2';
  linked_learner_id constant uuid := '00000000-0000-4000-8000-0000000005a1';
  other_learner_id constant uuid := '00000000-0000-4000-8000-0000000005b1';
  cohort_id constant uuid := '1d62cc77-1832-4a77-9d47-daf62dc03939';
BEGIN
  IF (SELECT count(*) FROM auth.users) <> 2 THEN
    RAISE EXCEPTION 'M5 fixture preflight: unexpected Auth count.';
  END IF;
  IF (SELECT count(*) FROM public.profiles) <> 2 THEN
    RAISE EXCEPTION 'M5 fixture preflight: unexpected profile count.';
  END IF;

  INSERT INTO public.family_relationships (
    organization_id, parent_profile_id, child_profile_id,
    parent_user_id, learner_user_id, relationship, status, created_by
  ) VALUES (
    org_id, actor_id, linked_profile_id,
    actor_id, linked_profile_id, 'guardian', 'active', actor_id
  );

  INSERT INTO public.profiles (
    id, organization_id, auth_user_id, full_name, profile_type, status, role, created_by
  ) VALUES (
    other_profile_id, org_id, NULL, 'M5 controlled cross-family fixture',
    'child', 'active', 'learner', actor_id
  );

  INSERT INTO public.learner_profiles (
    id, organization_id, profile_id, user_id, guardian_user_id, full_name, gender,
    access_mode, status, created_by
  ) VALUES
    (linked_learner_id, org_id, linked_profile_id, linked_profile_id, NULL,
     'M5 linked child fixture', 'unspecified', 'individual', 'active', actor_id),
    (other_learner_id, org_id, other_profile_id, NULL, actor_id,
     'M5 other family fixture', 'unspecified', 'guardian_managed', 'active', actor_id);

  INSERT INTO public.cohort_memberships (
    organization_id, cohort_id, user_id, role, status, created_by
  ) VALUES (org_id, cohort_id, actor_id, 'teacher', 'active', actor_id);

  INSERT INTO public.learner_cohort_memberships (
    organization_id, cohort_id, learner_id, profile_id, status, created_by
  ) VALUES (org_id, cohort_id, linked_learner_id, linked_profile_id, 'active', actor_id);
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quiz_attempts'
      AND column_name = 'profile_id' AND data_type = 'uuid' AND is_nullable = 'NO'
  ) THEN RAISE EXCEPTION 'M5-01 quiz_attempts.profile_id definition'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.quiz_attempts'::regclass
      AND conname = 'quiz_attempts_profile_id_fkey' AND confdeltype = 'r'
  ) THEN RAISE EXCEPTION 'M5-02 quiz profile FK'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'quiz_attempts'
      AND indexname = 'quiz_attempts_profile_id_idx'
  ) THEN RAISE EXCEPTION 'M5-03 quiz profile index'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'quiz_attempts'
      AND indexname = 'quiz_attempts_quiz_profile_attempt_unique_idx'
  ) THEN RAISE EXCEPTION 'M5-04 canonical attempt uniqueness'; END IF;
  IF EXISTS (SELECT 1 FROM public.quiz_attempts WHERE profile_id IS NULL) THEN
    RAISE EXCEPTION 'M5-05 quiz backfill completeness';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.quiz_attempts AS attempt
    JOIN public.profiles AS profile ON profile.id = attempt.profile_id
    WHERE profile.auth_user_id IS DISTINCT FROM attempt.user_id
       OR profile.organization_id IS DISTINCT FROM attempt.organization_id
  ) THEN RAISE EXCEPTION 'M5-06 exact quiz mapping'; END IF;
  IF (SELECT count(*) FROM public.quiz_attempts) <> 1 THEN
    RAISE EXCEPTION 'M5-07 quiz row count changed';
  END IF;
  IF (SELECT count(*) FROM auth.users) <> 2 THEN
    RAISE EXCEPTION 'M5-08 Auth changed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='private' AND p.proname='can_profile_access_lesson'
      AND p.prosecdef AND p.proconfig @> ARRAY['search_path=""']
  ) THEN RAISE EXCEPTION 'M5-09 private helper hardening'; END IF;
  IF has_function_privilege('public','private.can_profile_access_lesson(uuid,uuid)','EXECUTE')
     OR has_function_privilege('anon','private.can_profile_access_lesson(uuid,uuid)','EXECUTE')
     OR NOT has_function_privilege('authenticated','private.can_profile_access_lesson(uuid,uuid)','EXECUTE')
  THEN RAISE EXCEPTION 'M5-10 helper grants'; END IF;
  IF has_table_privilege('authenticated','public.profiles','UPDATE') THEN
    RAISE EXCEPTION 'M5-11 profiles UPDATE grant widened';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='progress'
      AND policyname='progress_write_own' AND with_check LIKE '%can_act_as_profile%'
  ) THEN RAISE EXCEPTION 'M5-12 progress canonical policy'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='homework_submissions'
      AND policyname='homework_insert_own' AND with_check LIKE '%can_act_as_profile%'
  ) THEN RAISE EXCEPTION 'M5-13 homework canonical policy'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quiz_attempts'
      AND policyname='quiz_attempts_insert' AND with_check LIKE '%profile_id%'
  ) THEN RAISE EXCEPTION 'M5-14 quiz canonical policy'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id='390a6abd-8712-490c-8f8d-846165bf9f9f'
      AND feature_flags->>'profile_identity_v2'='true'
  ) THEN RAISE EXCEPTION 'M5-15 feature flag'; END IF;
  IF (SELECT count(*) FROM public.profiles WHERE id IN (
    '777cbdea-7c2c-430d-872f-26fa2d6e9088',
    '7dffded4-9741-4692-b593-216cc1f4e609'
  )) <> 2 THEN RAISE EXCEPTION 'M5-16 historical profile UUIDs'; END IF;
  IF (SELECT count(*) FROM public.learner_profiles WHERE id='ea520428-ed54-4954-92de-eb149d17b4e0') <> 1 THEN
    RAISE EXCEPTION 'M5-17 historical learner UUID';
  END IF;
  IF (SELECT count(*) FROM public.organization_memberships) <> 2 THEN
    RAISE EXCEPTION 'M5-18 organization memberships changed';
  END IF;
  IF (SELECT count(*) FROM public.learner_cohort_memberships WHERE id='bf3aca07-ecbb-480e-a03e-3ee4ba733830') <> 1 THEN
    RAISE EXCEPTION 'M5-19 M4 learner assignment changed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.profiles'::regclass AND conname='profiles_auth_user_id_fkey'
  ) THEN RAISE EXCEPTION 'M5-20 Auth/profile FK'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='profiles'
      AND indexname='profiles_auth_user_id_unique_idx'
  ) THEN RAISE EXCEPTION 'M5-21 global Auth index'; END IF;
  IF (SELECT count(*) FROM public.progress) <> 1 THEN
    RAISE EXCEPTION 'M5-22 progress rows changed';
  END IF;
  IF (SELECT count(*) FROM public.homework_submissions) <> 0 THEN
    RAISE EXCEPTION 'M5-23 homework rows changed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='submit_quiz_attempt'
      AND pg_get_function_identity_arguments(p.oid)='p_quiz_id uuid, p_answers jsonb, p_profile_id uuid'
  ) THEN RAISE EXCEPTION 'M5-24 quiz RPC signature'; END IF;
  IF NOT has_function_privilege('authenticated','public.submit_quiz_attempt(uuid,jsonb,uuid)','EXECUTE')
     OR has_function_privilege('anon','public.submit_quiz_attempt(uuid,jsonb,uuid)','EXECUTE')
  THEN RAISE EXCEPTION 'M5-25 quiz RPC grants'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename IN ('progress','homework_submissions','quiz_attempts')
      AND coalesce(qual,'') LIKE '%is_linked_parent%'
  ) THEN RAISE EXCEPTION 'M5-26 legacy family authorization remains'; END IF;
END
$$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','777cbdea-7c2c-430d-872f-26fa2d6e9088',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);

DO $$
BEGIN
  IF NOT private.can_act_as_profile('777cbdea-7c2c-430d-872f-26fa2d6e9088') THEN
    RAISE EXCEPTION 'M5-RLS-01 own profile denied';
  END IF;
  IF NOT private.can_act_as_profile('7dffded4-9741-4692-b593-216cc1f4e609') THEN
    RAISE EXCEPTION 'M5-RLS-02 linked child denied';
  END IF;
  IF private.can_act_as_profile('00000000-0000-4000-8000-0000000005b2') THEN
    RAISE EXCEPTION 'M5-RLS-03 cross-family access granted';
  END IF;
  IF (SELECT count(*) FROM public.profiles WHERE id='00000000-0000-4000-8000-0000000005b2') <> 0 THEN
    RAISE EXCEPTION 'M5-RLS-04 forged active profile became visible';
  END IF;
  IF NOT private.can_teach_profile('7dffded4-9741-4692-b593-216cc1f4e609') THEN
    RAISE EXCEPTION 'M5-RLS-05 assigned teacher lost learner';
  END IF;
  IF private.can_teach_profile('00000000-0000-4000-8000-0000000005b2') THEN
    RAISE EXCEPTION 'M5-RLS-06 cross-class learner exposed';
  END IF;
  IF (SELECT count(*) FROM public.quiz_attempts WHERE profile_id='777cbdea-7c2c-430d-872f-26fa2d6e9088') <> 1 THEN
    RAISE EXCEPTION 'M5-RLS-07 own canonical quiz invisible';
  END IF;
END
$$;

RESET ROLE;

-- Sensitivity: deliberately neutralize the cross-class fixture inside the transaction.
INSERT INTO public.learner_cohort_memberships (
  organization_id, cohort_id, learner_id, profile_id, status, created_by
) VALUES (
  '390a6abd-8712-490c-8f8d-846165bf9f9f',
  '1d62cc77-1832-4a77-9d47-daf62dc03939',
  '00000000-0000-4000-8000-0000000005b1',
  '00000000-0000-4000-8000-0000000005b2',
  'active',
  '777cbdea-7c2c-430d-872f-26fa2d6e9088'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','777cbdea-7c2c-430d-872f-26fa2d6e9088',true);
DO $$
BEGIN
  IF NOT private.can_teach_profile('00000000-0000-4000-8000-0000000005b2') THEN
    RAISE EXCEPTION 'M5-SENSITIVITY: the negative cross-class test did not turn red.';
  END IF;
END
$$;
RESET ROLE;
