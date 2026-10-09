-- Majliss assistant ingestion: private resumable uploads feeding the existing
-- majliss_recordings draft/review workflow. Additive and transaction-safe.

CREATE TABLE public.majliss_teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  teacher_id uuid NOT NULL,
  village_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_by uuid REFERENCES auth.users(id) ON UPDATE RESTRICT ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT majliss_teacher_assignments_scope_fk
    FOREIGN KEY (teacher_id, village_id, organization_id)
    REFERENCES public.majliss_teacher_villages(teacher_id, village_id, organization_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  UNIQUE (organization_id, user_id, teacher_id, village_id),
  UNIQUE (id, organization_id, user_id)
);

CREATE INDEX majliss_teacher_assignments_user_idx
  ON public.majliss_teacher_assignments(user_id, status, organization_id);

ALTER TABLE public.majliss_recordings
  ADD COLUMN storage_bucket text,
  ADD COLUMN storage_path text,
  ADD COLUMN original_file_name text,
  ADD COLUMN mime_type text,
  ADD COLUMN file_size_bytes bigint CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),
  ADD COLUMN received_at timestamptz,
  ADD COLUMN review_status text NOT NULL DEFAULT 'approved'
    CHECK (review_status IN ('pending','approved','rejected')),
  ADD COLUMN upload_source text NOT NULL DEFAULT 'admin'
    CHECK (upload_source IN ('admin','assistant_upload','whatsapp_import')),
  ADD COLUMN uploaded_by uuid REFERENCES auth.users(id) ON UPDATE RESTRICT ON DELETE SET NULL,
  ADD COLUMN content_fingerprint text,
  ADD COLUMN duplicate_of uuid REFERENCES public.majliss_recordings(id) ON UPDATE RESTRICT ON DELETE SET NULL,
  ADD COLUMN processing_status text NOT NULL DEFAULT 'ready'
    CHECK (processing_status IN ('uploaded','needs_normalization','ready','failed'));

ALTER TABLE public.majliss_recordings DROP CONSTRAINT majliss_recordings_media_url_check;
ALTER TABLE public.majliss_recordings ADD CONSTRAINT majliss_recordings_media_url_check
  CHECK (media_url ~ '^https://' OR media_url ~ '^storage://majliss-ingestion/');
ALTER TABLE public.majliss_recordings ADD CONSTRAINT majliss_recordings_storage_pair_check
  CHECK ((storage_bucket IS NULL) = (storage_path IS NULL));
ALTER TABLE public.majliss_recordings ADD CONSTRAINT majliss_recordings_assistant_metadata_check
  CHECK (
    upload_source <> 'assistant_upload'
    OR (
      storage_bucket = 'majliss-ingestion'
      AND storage_path IS NOT NULL
      AND original_file_name IS NOT NULL
      AND mime_type IS NOT NULL
      AND file_size_bytes IS NOT NULL
      AND received_at IS NOT NULL
      AND uploaded_by IS NOT NULL
      AND content_fingerprint IS NOT NULL
    )
  );

CREATE INDEX majliss_recordings_review_queue_idx
  ON public.majliss_recordings(organization_id, review_status, received_at DESC)
  WHERE upload_source = 'assistant_upload';
CREATE INDEX majliss_recordings_fingerprint_idx
  ON public.majliss_recordings(organization_id, content_fingerprint)
  WHERE content_fingerprint IS NOT NULL;

CREATE FUNCTION private.guard_majliss_assistant_ingestion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor uuid := (SELECT auth.uid());
  is_manager boolean;
BEGIN
  IF NEW.upload_source <> 'assistant_upload' THEN
    RETURN NEW;
  END IF;

  is_manager := actor IS NOT NULL AND private.can_manage_learning(NEW.organization_id);

  IF TG_OP = 'INSERT' THEN
    IF actor IS NULL OR NEW.uploaded_by IS DISTINCT FROM actor THEN
      RAISE EXCEPTION 'Majliss upload actor mismatch.' USING ERRCODE='42501';
    END IF;
    IF NEW.status <> 'draft' OR NEW.review_status <> 'pending' OR NEW.access_tier <> 'free' THEN
      RAISE EXCEPTION 'Assistant uploads must enter the free draft review queue.' USING ERRCODE='23514';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM public.majliss_teacher_assignments assignment
      JOIN public.organization_memberships membership
        ON membership.organization_id = assignment.organization_id
       AND membership.user_id = assignment.user_id
       AND membership.status = 'active'
      WHERE assignment.organization_id = NEW.organization_id
        AND assignment.user_id = actor
        AND assignment.teacher_id = NEW.teacher_id
        AND assignment.village_id = NEW.village_id
        AND assignment.status = 'active'
    ) THEN
      RAISE EXCEPTION 'Assistant is not assigned to this Majliss teacher.' USING ERRCODE='42501';
    END IF;
    SELECT prior.id INTO NEW.duplicate_of
    FROM public.majliss_recordings prior
    WHERE prior.organization_id = NEW.organization_id
      AND prior.content_fingerprint = NEW.content_fingerprint
      AND prior.upload_source = 'assistant_upload'
    ORDER BY prior.received_at, prior.id
    LIMIT 1;
    RETURN NEW;
  END IF;

  IF is_manager THEN
    RETURN NEW;
  END IF;
  IF actor IS NULL OR OLD.uploaded_by IS DISTINCT FROM actor
     OR OLD.status <> 'draft' OR OLD.review_status <> 'pending' THEN
    RAISE EXCEPTION 'Assistant cannot edit this Majliss upload.' USING ERRCODE='42501';
  END IF;
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.village_id IS DISTINCT FROM OLD.village_id
     OR NEW.teacher_id IS DISTINCT FROM OLD.teacher_id
     OR NEW.media_url IS DISTINCT FROM OLD.media_url
     OR NEW.storage_bucket IS DISTINCT FROM OLD.storage_bucket
     OR NEW.storage_path IS DISTINCT FROM OLD.storage_path
     OR NEW.original_file_name IS DISTINCT FROM OLD.original_file_name
     OR NEW.mime_type IS DISTINCT FROM OLD.mime_type
     OR NEW.file_size_bytes IS DISTINCT FROM OLD.file_size_bytes
     OR NEW.received_at IS DISTINCT FROM OLD.received_at
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.review_status IS DISTINCT FROM OLD.review_status
     OR NEW.upload_source IS DISTINCT FROM OLD.upload_source
     OR NEW.uploaded_by IS DISTINCT FROM OLD.uploaded_by
     OR NEW.content_fingerprint IS DISTINCT FROM OLD.content_fingerprint
     OR NEW.duplicate_of IS DISTINCT FROM OLD.duplicate_of
     OR NEW.processing_status IS DISTINCT FROM OLD.processing_status
     OR NEW.order_index IS DISTINCT FROM OLD.order_index
     OR NEW.published_at IS DISTINCT FROM OLD.published_at THEN
    RAISE EXCEPTION 'Assistant may only edit draft title or description.' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER majliss_teacher_assignments_updated_at
BEFORE UPDATE ON public.majliss_teacher_assignments
FOR EACH ROW EXECUTE FUNCTION private.set_majliss_updated_at();
CREATE TRIGGER majliss_assistant_ingestion_guard
BEFORE INSERT OR UPDATE ON public.majliss_recordings
FOR EACH ROW EXECUTE FUNCTION private.guard_majliss_assistant_ingestion();

REVOKE ALL ON FUNCTION private.guard_majliss_assistant_ingestion()
  FROM PUBLIC, anon, authenticated;

ALTER TABLE public.majliss_teacher_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.majliss_teacher_assignments FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.majliss_teacher_assignments TO authenticated;
GRANT ALL ON TABLE public.majliss_teacher_assignments TO service_role;

CREATE POLICY majliss_teacher_assignments_read ON public.majliss_teacher_assignments
FOR SELECT TO authenticated
USING (user_id=(SELECT auth.uid()) OR private.can_manage_learning(organization_id));
CREATE POLICY majliss_teacher_assignments_admin_insert ON public.majliss_teacher_assignments
FOR INSERT TO authenticated
WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY majliss_teacher_assignments_admin_update ON public.majliss_teacher_assignments
FOR UPDATE TO authenticated
USING (private.can_manage_learning(organization_id))
WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY majliss_teacher_assignments_admin_delete ON public.majliss_teacher_assignments
FOR DELETE TO authenticated
USING (private.can_manage_learning(organization_id));

CREATE POLICY majliss_recordings_assistant_read ON public.majliss_recordings
FOR SELECT TO authenticated
USING (upload_source='assistant_upload' AND uploaded_by=(SELECT auth.uid()));
CREATE POLICY majliss_recordings_assistant_insert ON public.majliss_recordings
FOR INSERT TO authenticated
WITH CHECK (
  upload_source='assistant_upload'
  AND uploaded_by=(SELECT auth.uid())
  AND status='draft'
  AND review_status='pending'
  AND EXISTS (
    SELECT 1 FROM public.majliss_teacher_assignments assignment
    JOIN public.organization_memberships membership
      ON membership.organization_id=assignment.organization_id
     AND membership.user_id=assignment.user_id
     AND membership.status='active'
    WHERE assignment.organization_id=majliss_recordings.organization_id
      AND assignment.user_id=(SELECT auth.uid())
      AND assignment.teacher_id=majliss_recordings.teacher_id
      AND assignment.village_id=majliss_recordings.village_id
      AND assignment.status='active'
  )
);
CREATE POLICY majliss_recordings_assistant_update ON public.majliss_recordings
FOR UPDATE TO authenticated
USING (upload_source='assistant_upload' AND uploaded_by=(SELECT auth.uid()) AND status='draft' AND review_status='pending')
WITH CHECK (upload_source='assistant_upload' AND uploaded_by=(SELECT auth.uid()) AND status='draft' AND review_status='pending');

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES (
  'majliss-ingestion','majliss-ingestion',false,524288000,
  ARRAY['audio/opus','audio/ogg','audio/mp4','audio/x-m4a','audio/mpeg','audio/aac','audio/wav','audio/x-wav']
)
ON CONFLICT (id) DO UPDATE SET
  public=false,
  file_size_limit=EXCLUDED.file_size_limit,
  allowed_mime_types=EXCLUDED.allowed_mime_types;

CREATE POLICY majliss_ingestion_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id='majliss-ingestion'
  AND EXISTS (
    SELECT 1 FROM public.majliss_teacher_assignments assignment
    JOIN public.organization_memberships membership
      ON membership.organization_id=assignment.organization_id
     AND membership.user_id=assignment.user_id
     AND membership.status='active'
    WHERE assignment.id::text=(storage.foldername(name))[2]
      AND assignment.organization_id::text=(storage.foldername(name))[1]
      AND assignment.user_id=(SELECT auth.uid())
      AND assignment.user_id::text=(storage.foldername(name))[3]
      AND assignment.status='active'
  )
);
CREATE POLICY majliss_ingestion_authenticated_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id='majliss-ingestion'
  AND (
    owner_id=(SELECT auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.majliss_recordings recording
      WHERE recording.storage_bucket=bucket_id
        AND recording.storage_path=name
        AND (
          recording.uploaded_by=(SELECT auth.uid())
          OR private.can_manage_learning(recording.organization_id)
          OR (recording.status='published' AND recording.review_status='approved')
        )
    )
  )
);
CREATE POLICY majliss_ingestion_public_published_read ON storage.objects
FOR SELECT TO anon
USING (
  bucket_id='majliss-ingestion'
  AND EXISTS (
    SELECT 1 FROM public.majliss_recordings recording
    WHERE recording.storage_bucket=bucket_id
      AND recording.storage_path=name
      AND recording.status='published'
      AND recording.review_status='approved'
      AND recording.access_tier='free'
  )
);
CREATE POLICY majliss_ingestion_update_own ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id='majliss-ingestion'
  AND owner_id=(SELECT auth.uid()::text)
  AND EXISTS (
    SELECT 1 FROM public.majliss_teacher_assignments assignment
    WHERE assignment.id::text=(storage.foldername(name))[2]
      AND assignment.user_id=(SELECT auth.uid())
      AND assignment.status='active'
  )
)
WITH CHECK (
  bucket_id='majliss-ingestion'
  AND owner_id=(SELECT auth.uid()::text)
);

UPDATE public.organizations
SET feature_flags=coalesce(feature_flags,'{}'::jsonb)||jsonb_build_object('majliss_ingestion_v1',false)
WHERE id='390a6abd-8712-490c-8f8d-846165bf9f9f';

COMMENT ON TABLE public.majliss_teacher_assignments IS
  'Explicit server-enforced assistant upload scopes for Majliss teachers and villages.';
