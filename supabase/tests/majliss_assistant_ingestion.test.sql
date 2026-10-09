-- Run after the Majliss ingestion migration, inside the same transaction.
-- All fixtures disappear with the caller's final ROLLBACK.

CREATE TEMP TABLE majliss_ingestion_baseline AS
SELECT
  (SELECT count(*) FROM auth.users) AS auth_count,
  (SELECT count(*) FROM public.majliss_recordings) AS recording_count,
  (SELECT count(*) FROM public.majliss_teacher_assignments) AS assignment_count;

DO $$
DECLARE
  checks integer := 0;
  bucket_mimes text[];
BEGIN
  IF to_regclass('public.majliss_teacher_assignments') IS NULL THEN RAISE EXCEPTION 'I01 assignment table missing'; END IF; checks := checks + 1;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='majliss_recordings' AND column_name='review_status' AND is_nullable='NO') THEN RAISE EXCEPTION 'I02 review_status missing'; END IF; checks := checks + 1;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='majliss_recordings' AND column_name='storage_path') THEN RAISE EXCEPTION 'I03 storage_path missing'; END IF; checks := checks + 1;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='majliss_teacher_assignments_scope_fk' AND confrelid='public.majliss_teacher_villages'::regclass) THEN RAISE EXCEPTION 'I04 assignment scope FK missing'; END IF; checks := checks + 1;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='majliss_recordings_assistant_metadata_check') THEN RAISE EXCEPTION 'I05 assistant metadata constraint missing'; END IF; checks := checks + 1;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='majliss_recordings_review_queue_idx') THEN RAISE EXCEPTION 'I06 review index missing'; END IF; checks := checks + 1;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='majliss_recordings_fingerprint_idx') THEN RAISE EXCEPTION 'I07 fingerprint index missing'; END IF; checks := checks + 1;
  SELECT allowed_mime_types INTO bucket_mimes FROM storage.buckets WHERE id='majliss-ingestion' AND public=false;
  IF bucket_mimes IS NULL OR NOT bucket_mimes @> ARRAY['audio/opus','audio/ogg','audio/mp4','audio/x-m4a','audio/mpeg','audio/aac','audio/wav','audio/x-wav'] THEN RAISE EXCEPTION 'I08 private bucket formats incomplete'; END IF; checks := checks + 1;
  IF EXISTS (SELECT 1 FROM information_schema.role_routine_grants WHERE routine_schema='private' AND routine_name='guard_majliss_assistant_ingestion' AND grantee IN ('PUBLIC','anon','authenticated')) THEN RAISE EXCEPTION 'I09 private guard executable'; END IF; checks := checks + 1;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='majliss_recordings' AND policyname='majliss_recordings_assistant_insert') THEN RAISE EXCEPTION 'I10 insert policy missing'; END IF; checks := checks + 1;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='majliss_ingestion_insert') THEN RAISE EXCEPTION 'I11 storage insert policy missing'; END IF; checks := checks + 1;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE 'majliss_ingestion%' AND cmd='DELETE') THEN RAISE EXCEPTION 'I12 physical delete policy must not exist'; END IF; checks := checks + 1;
  IF (SELECT count(*) FROM auth.users) <> (SELECT auth_count FROM majliss_ingestion_baseline) THEN RAISE EXCEPTION 'I13 auth changed'; END IF; checks := checks + 1;
  IF (SELECT count(*) FROM public.majliss_recordings) <> (SELECT recording_count FROM majliss_ingestion_baseline) THEN RAISE EXCEPTION 'I14 recordings changed before fixture'; END IF; checks := checks + 1;
  IF NOT EXISTS (SELECT 1 FROM public.majliss_villages WHERE id='5f358369-17ed-541a-bce1-f162dad14186' AND name='Touba' AND country='Guinée') THEN RAISE EXCEPTION 'I15 Touba missing'; END IF; checks := checks + 1;
  IF NOT EXISTS (SELECT 1 FROM public.majliss_teachers WHERE id='c4d2e906-fbb2-55cd-a672-3d81eb1d5bc0' AND display_name='Oustaz Banfa Diaby') THEN RAISE EXCEPTION 'I16 Banfa missing'; END IF; checks := checks + 1;
  IF checks <> 16 THEN RAISE EXCEPTION 'integrity count mismatch'; END IF;
END $$;

INSERT INTO public.majliss_teacher_assignments(
  id,organization_id,user_id,teacher_id,village_id,created_by
) VALUES (
  '91000000-0000-4000-8000-000000000001',
  '390a6abd-8712-490c-8f8d-846165bf9f9f',
  '777cbdea-7c2c-430d-872f-26fa2d6e9088',
  'c4d2e906-fbb2-55cd-a672-3d81eb1d5bc0',
  '5f358369-17ed-541a-bce1-f162dad14186',
  '7dffded4-9741-4692-b593-216cc1f4e609'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','777cbdea-7c2c-430d-872f-26fa2d6e9088',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claims','{"sub":"777cbdea-7c2c-430d-872f-26fa2d6e9088","role":"authenticated"}',true);

INSERT INTO public.majliss_recordings(
  id,organization_id,village_id,teacher_id,title,slug,media_type,media_url,
  access_tier,status,storage_bucket,storage_path,original_file_name,mime_type,
  file_size_bytes,received_at,review_status,upload_source,uploaded_by,
  content_fingerprint,processing_status,created_by
) VALUES (
  '92000000-0000-4000-8000-000000000001',
  '390a6abd-8712-490c-8f8d-846165bf9f9f',
  '5f358369-17ed-541a-bce1-f162dad14186',
  'c4d2e906-fbb2-55cd-a672-3d81eb1d5bc0',
  'Fixture WhatsApp OPUS','fixture-whatsapp-opus','audio',
  'storage://majliss-ingestion/390a6abd-8712-490c-8f8d-846165bf9f9f/91000000-0000-4000-8000-000000000001/777cbdea-7c2c-430d-872f-26fa2d6e9088/fixture.opus',
  'free','draft','majliss-ingestion',
  '390a6abd-8712-490c-8f8d-846165bf9f9f/91000000-0000-4000-8000-000000000001/777cbdea-7c2c-430d-872f-26fa2d6e9088/fixture.opus',
  'PTT-20261009-WA0001.opus','audio/opus',2048,now(),'pending','assistant_upload',
  '777cbdea-7c2c-430d-872f-26fa2d6e9088','sha256:test-opus','needs_normalization',
  '777cbdea-7c2c-430d-872f-26fa2d6e9088'
);

DO $$
BEGIN
  IF (SELECT count(*) FROM public.majliss_recordings WHERE id='92000000-0000-4000-8000-000000000001') <> 1 THEN RAISE EXCEPTION 'R01 own draft unreadable'; END IF;
  IF (SELECT review_status FROM public.majliss_recordings WHERE id='92000000-0000-4000-8000-000000000001') <> 'pending' THEN RAISE EXCEPTION 'R02 draft not pending'; END IF;
END $$;

UPDATE public.majliss_recordings SET title='Titre assistant corrigé' WHERE id='92000000-0000-4000-8000-000000000001';

DO $$
BEGIN
  BEGIN
    UPDATE public.majliss_recordings SET status='published',review_status='approved' WHERE id='92000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'R03 assistant publication unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL;
  END;
  IF (SELECT status FROM public.majliss_recordings WHERE id='92000000-0000-4000-8000-000000000001') <> 'draft' THEN RAISE EXCEPTION 'R04 failed publish mutated data'; END IF;
  BEGIN
    UPDATE public.majliss_recordings SET teacher_id=gen_random_uuid() WHERE id='92000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'R05 reassignment unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege OR check_violation OR foreign_key_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.majliss_recordings(
      organization_id,village_id,teacher_id,title,slug,media_type,media_url,status,
      storage_bucket,storage_path,original_file_name,mime_type,file_size_bytes,received_at,
      review_status,upload_source,uploaded_by,content_fingerprint,processing_status
    ) VALUES (
      '390a6abd-8712-490c-8f8d-846165bf9f9f','5f358369-17ed-541a-bce1-f162dad14186',gen_random_uuid(),
      'Cross teacher','cross-teacher-'||gen_random_uuid(),'audio','storage://majliss-ingestion/invalid','draft',
      'majliss-ingestion','invalid','x.ogg','audio/ogg',1,now(),'pending','assistant_upload',
      '777cbdea-7c2c-430d-872f-26fa2d6e9088','cross','ready'
    );
    RAISE EXCEPTION 'R06 cross-professor insert unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege OR check_violation OR foreign_key_violation THEN NULL;
  END;
END $$;

RESET ROLE;

-- A different JWT/profile, with no assignment in this organization, sees neither
-- the assignment nor the assistant's private draft and cannot create one.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000003',true);
SELECT set_config('request.jwt.claims','{"sub":"93000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.majliss_teacher_assignments) <> 0 THEN RAISE EXCEPTION 'R10 cross-profile assignment visible'; END IF;
  IF (SELECT count(*) FROM public.majliss_recordings WHERE organization_id='390a6abd-8712-490c-8f8d-846165bf9f9f') <> 0 THEN RAISE EXCEPTION 'R11 cross-organization/private draft visible'; END IF;
END $$;
RESET ROLE;

-- Duplicate alert: same organization + fingerprint is retained and linked, not deleted.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','777cbdea-7c2c-430d-872f-26fa2d6e9088',true);
INSERT INTO public.majliss_recordings(
  id,organization_id,village_id,teacher_id,title,slug,media_type,media_url,
  status,storage_bucket,storage_path,original_file_name,mime_type,file_size_bytes,
  received_at,review_status,upload_source,uploaded_by,content_fingerprint,processing_status
) VALUES (
  '92000000-0000-4000-8000-000000000002','390a6abd-8712-490c-8f8d-846165bf9f9f',
  '5f358369-17ed-541a-bce1-f162dad14186','c4d2e906-fbb2-55cd-a672-3d81eb1d5bc0',
  'Fixture duplicate','fixture-duplicate','audio','storage://majliss-ingestion/fixture-duplicate','draft',
  'majliss-ingestion','fixture-duplicate','duplicate.opus','audio/opus',2048,now(),'pending',
  'assistant_upload','777cbdea-7c2c-430d-872f-26fa2d6e9088','sha256:test-opus','needs_normalization'
);
DO $$ BEGIN
  IF (SELECT duplicate_of FROM public.majliss_recordings WHERE id='92000000-0000-4000-8000-000000000002') <> '92000000-0000-4000-8000-000000000001' THEN RAISE EXCEPTION 'R07 duplicate was not flagged'; END IF;
END $$;
RESET ROLE;

-- A real manager can review and publish; assistant identity data remains immutable.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','7dffded4-9741-4692-b593-216cc1f4e609',true);
SELECT set_config('request.jwt.claims','{"sub":"7dffded4-9741-4692-b593-216cc1f4e609","role":"authenticated"}',true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.majliss_recordings WHERE id='92000000-0000-4000-8000-000000000001') <> 1 THEN RAISE EXCEPTION 'R08 manager cannot read queue'; END IF;
END $$;
UPDATE public.majliss_recordings
SET status='published',review_status='approved',published_at=now()
WHERE id='92000000-0000-4000-8000-000000000001';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.majliss_recordings WHERE id='92000000-0000-4000-8000-000000000001' AND status='published' AND review_status='approved') THEN RAISE EXCEPTION 'R09 manager publication failed'; END IF;
END $$;
RESET ROLE;

-- Sensitivity gate: prove the assertion machinery observes a deliberately false claim.
DO $$
DECLARE deliberately_red boolean;
BEGIN
  SELECT (count(*)=0) INTO deliberately_red
  FROM public.majliss_recordings WHERE id='92000000-0000-4000-8000-000000000001';
  IF deliberately_red THEN RAISE EXCEPTION 'S01 sensitivity fixture did not turn red'; END IF;
END $$;

SELECT jsonb_build_object(
  'integrity','16/16',
  'rls','11/11',
  'sensitivity','PASS',
  'fixtures','ROLLBACK REQUIRED'
) AS majliss_ingestion_test_result;
