-- Execute after the Majliss migration, inside a transaction that is always rolled back.
CREATE TEMP TABLE majliss_test_results(test text PRIMARY KEY, ok boolean NOT NULL, detail text);
GRANT SELECT, INSERT, UPDATE ON majliss_test_results TO anon, authenticated;

INSERT INTO majliss_test_results VALUES
('tables_created', (SELECT count(*)=5 FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('majliss_villages','majliss_teachers','majliss_teacher_villages','majliss_recordings','profile_media_progress')), 'five additive tables'),
('rls_enabled', (SELECT count(*)=5 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('majliss_villages','majliss_teachers','majliss_teacher_villages','majliss_recordings','profile_media_progress') AND c.relrowsecurity), 'RLS on every table'),
('pilot_village_exact', (SELECT count(*)=1 FROM public.majliss_villages WHERE id='5f358369-17ed-541a-bce1-f162dad14186' AND name='Touba' AND country='Guinée' AND slug='touba-guinee' AND status='published'), 'exact supplied village'),
('pilot_teacher_exact', (SELECT count(*)=1 FROM public.majliss_teachers WHERE id='c4d2e906-fbb2-55cd-a672-3d81eb1d5bc0' AND display_name='Oustaz Banfa Diaby' AND status='published'), 'exact supplied teacher'),
('pilot_association_exact', (SELECT count(*)=1 FROM public.majliss_teacher_villages WHERE teacher_id='c4d2e906-fbb2-55cd-a672-3d81eb1d5bc0' AND village_id='5f358369-17ed-541a-bce1-f162dad14186'), 'teacher linked to Touba'),
('no_recording_invented', (SELECT count(*)=0 FROM public.majliss_recordings), 'no source URL supplied'),
('feature_flag_off', (SELECT feature_flags->>'majliss_v1'='false' FROM public.organizations WHERE id='390a6abd-8712-490c-8f8d-846165bf9f9f'), 'safe rollout default'),
('auth_unchanged', (SELECT count(*)=2 FROM auth.users), 'two existing auth users'),
('profiles_unchanged', (SELECT count(*)=2 FROM public.profiles), 'two existing profiles'),
('learners_unchanged', (SELECT count(*)=1 FROM public.learner_profiles), 'one existing learner'),
('private_functions', (SELECT count(*)=2 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='private' AND p.proname IN ('set_majliss_updated_at','guard_profile_media_progress')), 'both functions private'),
('private_execute_revoked', NOT EXISTS (SELECT 1 FROM information_schema.routine_privileges WHERE routine_schema='private' AND routine_name IN ('set_majliss_updated_at','guard_profile_media_progress') AND grantee IN ('PUBLIC','anon','authenticated')), 'no Data API execute'),
('anon_no_progress_grant', NOT has_table_privilege('anon','public.profile_media_progress','select'), 'progress is private'),
('anon_catalog_readonly', has_table_privilege('anon','public.majliss_recordings','select') AND NOT has_table_privilege('anon','public.majliss_recordings','insert') AND NOT has_table_privilege('anon','public.majliss_recordings','update'), 'public catalog only'),
('authenticated_progress_grants', has_table_privilege('authenticated','public.profile_media_progress','select') AND has_table_privilege('authenticated','public.profile_media_progress','insert') AND has_table_privilege('authenticated','public.profile_media_progress','update') AND NOT has_table_privilege('authenticated','public.profile_media_progress','delete'), 'least privilege'),
('recording_fk', EXISTS (SELECT 1 FROM pg_constraint WHERE conname='majliss_recordings_teacher_village_fk' AND contype='f'), 'recording requires exact teacher/village/org'),
('progress_profile_fk', EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profile_media_progress_profile_fk' AND contype='f'), 'profile FK'),
('progress_recording_fk', EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profile_media_progress_recording_fk' AND contype='f'), 'recording/org composite FK'),
('progress_unique', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.profile_media_progress'::regclass AND contype='u'), 'one progress row per profile/recording'),
('source_unique', to_regclass('public.majliss_recordings_source_key_unique_idx') IS NOT NULL, 'idempotent source key'),
('m8_separate', to_regclass('public.profile_session_progress') IS NOT NULL AND to_regclass('public.profile_media_progress') IS NOT NULL, 'media progress isolated from M8'),
('legacy_learning_intact', (SELECT count(*)>0 FROM public.subjects) AND (SELECT count(*)>0 FROM public.books) AND (SELECT count(*)>0 FROM public.lessons), 'learning catalog remains present');

INSERT INTO public.majliss_recordings(id,organization_id,village_id,teacher_id,title,slug,media_type,media_url,duration_seconds,order_index,access_tier,status,published_at,created_by,source_key)
VALUES
('85b3c711-1789-53ab-8d3e-4534f46b28c7','390a6abd-8712-490c-8f8d-846165bf9f9f','5f358369-17ed-541a-bce1-f162dad14186','c4d2e906-fbb2-55cd-a672-3d81eb1d5bc0','Fixture transactionnelle','fixture-transactionnelle','audio','https://example.com/fixture.mp3',120,0,'free','published',now(),'7dffded4-9741-4692-b593-216cc1f4e609','transaction-fixture'),
('0eb9d8f0-a42f-53f4-b726-24fdf9f8c849','390a6abd-8712-490c-8f8d-846165bf9f9f','5f358369-17ed-541a-bce1-f162dad14186','c4d2e906-fbb2-55cd-a672-3d81eb1d5bc0','Fixture brouillon','fixture-brouillon','audio','https://example.com/draft.mp3',60,1,'free','draft',NULL,'7dffded4-9741-4692-b593-216cc1f4e609','transaction-draft');

CREATE FUNCTION pg_temp.try_insert_village() RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.majliss_villages(organization_id,name,slug,status,created_by)
  VALUES ('390a6abd-8712-490c-8f8d-846165bf9f9f','Interdit','interdit','draft','777cbdea-7c2c-430d-872f-26fa2d6e9088');
  RETURN false;
EXCEPTION WHEN insufficient_privilege THEN RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.try_insert_village() TO authenticated;

CREATE FUNCTION pg_temp.try_cross_profile() RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.profile_media_progress(organization_id,profile_id,recording_id,actor_user_id,position_seconds)
  VALUES ('390a6abd-8712-490c-8f8d-846165bf9f9f','7dffded4-9741-4692-b593-216cc1f4e609','85b3c711-1789-53ab-8d3e-4534f46b28c7','777cbdea-7c2c-430d-872f-26fa2d6e9088',10);
  RETURN false;
EXCEPTION WHEN insufficient_privilege OR check_violation THEN RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.try_cross_profile() TO authenticated;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
INSERT INTO majliss_test_results VALUES
('anon_published_village', (SELECT count(*)=1 FROM public.majliss_villages), 'published pilot visible'),
('anon_published_teacher', (SELECT count(*)=1 FROM public.majliss_teachers), 'published teacher visible'),
('anon_published_recording', (SELECT count(*)=1 FROM public.majliss_recordings), 'draft hidden and free published visible');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"777cbdea-7c2c-430d-872f-26fa2d6e9088","role":"authenticated"}',true);
INSERT INTO majliss_test_results VALUES
('learner_published_only', (SELECT count(*)=1 FROM public.majliss_recordings), 'learner cannot see draft'),
('learner_cannot_admin', pg_temp.try_insert_village(), 'normal authenticated insert denied');
INSERT INTO public.profile_media_progress(organization_id,profile_id,recording_id,actor_user_id,position_seconds,duration_seconds)
VALUES ('390a6abd-8712-490c-8f8d-846165bf9f9f','777cbdea-7c2c-430d-872f-26fa2d6e9088','85b3c711-1789-53ab-8d3e-4534f46b28c7','777cbdea-7c2c-430d-872f-26fa2d6e9088',25,120);
INSERT INTO majliss_test_results VALUES
('own_progress_write', (SELECT count(*)=1 AND max(position_seconds)=25 FROM public.profile_media_progress WHERE profile_id='777cbdea-7c2c-430d-872f-26fa2d6e9088'), 'own progress accepted'),
('cross_profile_denied', pg_temp.try_cross_profile(), 'unrelated profile denied');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"7dffded4-9741-4692-b593-216cc1f4e609","role":"authenticated"}',true);
INSERT INTO public.profile_media_progress(organization_id,profile_id,recording_id,actor_user_id,position_seconds,duration_seconds)
VALUES ('390a6abd-8712-490c-8f8d-846165bf9f9f','7dffded4-9741-4692-b593-216cc1f4e609','85b3c711-1789-53ab-8d3e-4534f46b28c7','7dffded4-9741-4692-b593-216cc1f4e609',40,120);
INSERT INTO majliss_test_results VALUES
('admin_sees_draft', (SELECT count(*)=2 FROM public.majliss_recordings), 'learning manager sees drafts'),
('owner_progress_write', (SELECT count(*)=1 FROM public.profile_media_progress WHERE profile_id='7dffded4-9741-4692-b593-216cc1f4e609'), 'owner progress accepted');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"777cbdea-7c2c-430d-872f-26fa2d6e9088","role":"authenticated"}',true);
INSERT INTO majliss_test_results VALUES
('cross_family_read_denied', (SELECT count(*)=0 FROM public.profile_media_progress WHERE profile_id='7dffded4-9741-4692-b593-216cc1f4e609'), 'unrelated family profile hidden');
RESET ROLE;

CREATE POLICY majliss_sensitivity_intentionally_bad ON public.profile_media_progress FOR SELECT TO authenticated USING (true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"777cbdea-7c2c-430d-872f-26fa2d6e9088","role":"authenticated"}',true);
INSERT INTO majliss_test_results VALUES
('sensitivity_red', (SELECT count(*)=1 FROM public.profile_media_progress WHERE profile_id='7dffded4-9741-4692-b593-216cc1f4e609'), 'bad policy makes negative test red');
RESET ROLE;
DROP POLICY majliss_sensitivity_intentionally_bad ON public.profile_media_progress;

SELECT count(*) FILTER (WHERE ok) AS passed, count(*) AS total,
  coalesce(jsonb_agg(jsonb_build_object('test',test,'detail',detail)) FILTER (WHERE NOT ok),'[]'::jsonb) AS failures
FROM majliss_test_results;
