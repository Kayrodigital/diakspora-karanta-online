-- QA-only Majliss audio upload via existing private Supabase Storage bucket.
-- Admin uploads use <organization>/admin/<auth-user>/<uuid>-<filename>.
CREATE POLICY majliss_ingestion_admin_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'majliss-ingestion'
  AND (storage.foldername(name))[2] = 'admin'
  AND (storage.foldername(name))[3] = (SELECT auth.uid()::text)
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND private.can_manage_learning(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY majliss_ingestion_admin_update_unlinked ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'majliss-ingestion'
  AND (storage.foldername(name))[2] = 'admin'
  AND (storage.foldername(name))[3] = (SELECT auth.uid()::text)
  AND owner_id = (SELECT auth.uid()::text)
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND private.can_manage_learning(((storage.foldername(name))[1])::uuid)
  AND NOT EXISTS (
    SELECT 1 FROM public.majliss_recordings r
    WHERE r.storage_bucket = bucket_id AND r.storage_path = name
  )
)
WITH CHECK (
  bucket_id = 'majliss-ingestion'
  AND (storage.foldername(name))[2] = 'admin'
  AND (storage.foldername(name))[3] = (SELECT auth.uid()::text)
  AND owner_id = (SELECT auth.uid()::text)
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND private.can_manage_learning(((storage.foldername(name))[1])::uuid)
);

-- Close a pre-existing authenticated read path for published Premium recordings.
ALTER POLICY majliss_ingestion_authenticated_read ON storage.objects
USING (
  bucket_id = 'majliss-ingestion'
  AND (
    owner_id = (SELECT auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.majliss_recordings recording
      WHERE recording.storage_bucket = bucket_id
        AND recording.storage_path = name
        AND (
          recording.uploaded_by = (SELECT auth.uid())
          OR private.can_manage_learning(recording.organization_id)
          OR (
            recording.status = 'published'
            AND recording.review_status = 'approved'
            AND recording.access_tier = 'free'
          )
        )
    )
  )
);
