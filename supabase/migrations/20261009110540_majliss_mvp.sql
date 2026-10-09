-- Majliss MVP: Village -> Teacher -> Recording, deliberately separate from
-- the canonical learning hierarchy. Additive and transaction-safe.

CREATE TABLE public.majliss_villages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  slug text NOT NULL CHECK (slug = lower(slug) AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  country text,
  description text,
  image_url text,
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON UPDATE RESTRICT ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug),
  UNIQUE (id, organization_id)
);

CREATE TABLE public.majliss_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 160),
  slug text NOT NULL CHECK (slug = lower(slug) AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  biography text,
  photo_url text,
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON UPDATE RESTRICT ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug),
  UNIQUE (id, organization_id)
);

CREATE TABLE public.majliss_teacher_villages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  teacher_id uuid NOT NULL,
  village_id uuid NOT NULL,
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  created_by uuid REFERENCES auth.users(id) ON UPDATE RESTRICT ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT majliss_teacher_villages_teacher_fk FOREIGN KEY (teacher_id, organization_id)
    REFERENCES public.majliss_teachers(id, organization_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT majliss_teacher_villages_village_fk FOREIGN KEY (village_id, organization_id)
    REFERENCES public.majliss_villages(id, organization_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  UNIQUE (teacher_id, village_id),
  UNIQUE (teacher_id, village_id, organization_id)
);

CREATE TABLE public.majliss_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  village_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 240),
  slug text NOT NULL CHECK (slug = lower(slug) AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  media_type text NOT NULL CHECK (media_type IN ('audio','youtube','video')),
  media_url text NOT NULL CHECK (media_url ~ '^https://'),
  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  recorded_on date,
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  language text,
  access_tier text NOT NULL DEFAULT 'free' CHECK (access_tier IN ('free','premium')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  thumbnail_url text,
  source_key text,
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON UPDATE RESTRICT ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT majliss_recordings_teacher_village_fk FOREIGN KEY (teacher_id, village_id, organization_id)
    REFERENCES public.majliss_teacher_villages(teacher_id, village_id, organization_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  UNIQUE (organization_id, slug),
  UNIQUE (id, organization_id)
);

CREATE UNIQUE INDEX majliss_recordings_source_key_unique_idx
  ON public.majliss_recordings(organization_id, source_key)
  WHERE source_key IS NOT NULL;
CREATE INDEX majliss_villages_catalog_idx
  ON public.majliss_villages(organization_id, status, order_index, name);
CREATE INDEX majliss_teachers_catalog_idx
  ON public.majliss_teachers(organization_id, status, order_index, display_name);
CREATE INDEX majliss_teacher_villages_village_idx
  ON public.majliss_teacher_villages(village_id, order_index, teacher_id);
CREATE INDEX majliss_recordings_catalog_idx
  ON public.majliss_recordings(village_id, teacher_id, status, order_index, recorded_on DESC);

CREATE TABLE public.profile_media_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  profile_id uuid NOT NULL,
  recording_id uuid NOT NULL,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  position_seconds integer NOT NULL DEFAULT 0 CHECK (position_seconds >= 0),
  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  last_played_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_media_progress_profile_fk FOREIGN KEY (profile_id)
    REFERENCES public.profiles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT profile_media_progress_recording_fk FOREIGN KEY (recording_id, organization_id)
    REFERENCES public.majliss_recordings(id, organization_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  UNIQUE (profile_id, recording_id)
);

CREATE INDEX profile_media_progress_recent_idx
  ON public.profile_media_progress(profile_id, last_played_at DESC);
CREATE INDEX profile_media_progress_recording_idx
  ON public.profile_media_progress(recording_id);

CREATE FUNCTION private.set_majliss_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE FUNCTION private.guard_profile_media_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.actor_user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Media progress actor must be the authenticated user.' USING ERRCODE='42501';
  END IF;
  IF NOT (SELECT private.can_act_as_profile(NEW.profile_id)) THEN
    RAISE EXCEPTION 'Profile access denied.' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles profile
    WHERE profile.id=NEW.profile_id AND profile.organization_id=NEW.organization_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.majliss_recordings recording
    WHERE recording.id=NEW.recording_id
      AND recording.organization_id=NEW.organization_id
      AND recording.status='published'
      AND recording.access_tier='free'
  ) THEN
    RAISE EXCEPTION 'Media progress organization or recording is invalid.' USING ERRCODE='23514';
  END IF;
  IF TG_OP='UPDATE' AND (
    NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.profile_id IS DISTINCT FROM OLD.profile_id
    OR NEW.recording_id IS DISTINCT FROM OLD.recording_id
    OR NEW.actor_user_id IS DISTINCT FROM OLD.actor_user_id
  ) THEN
    RAISE EXCEPTION 'Media progress identity fields are immutable.' USING ERRCODE='42501';
  END IF;
  IF NEW.duration_seconds IS NOT NULL AND NEW.position_seconds > NEW.duration_seconds THEN
    NEW.position_seconds := NEW.duration_seconds;
  END IF;
  NEW.last_played_at := now();
  RETURN NEW;
END
$$;

CREATE TRIGGER majliss_villages_updated_at BEFORE UPDATE ON public.majliss_villages
FOR EACH ROW EXECUTE FUNCTION private.set_majliss_updated_at();
CREATE TRIGGER majliss_teachers_updated_at BEFORE UPDATE ON public.majliss_teachers
FOR EACH ROW EXECUTE FUNCTION private.set_majliss_updated_at();
CREATE TRIGGER majliss_recordings_updated_at BEFORE UPDATE ON public.majliss_recordings
FOR EACH ROW EXECUTE FUNCTION private.set_majliss_updated_at();
CREATE TRIGGER profile_media_progress_updated_at BEFORE UPDATE ON public.profile_media_progress
FOR EACH ROW EXECUTE FUNCTION private.set_majliss_updated_at();
CREATE TRIGGER profile_media_progress_guard BEFORE INSERT OR UPDATE ON public.profile_media_progress
FOR EACH ROW EXECUTE FUNCTION private.guard_profile_media_progress();

REVOKE ALL ON FUNCTION private.set_majliss_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.guard_profile_media_progress() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.majliss_villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.majliss_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.majliss_teacher_villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.majliss_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_media_progress ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.majliss_villages, public.majliss_teachers,
  public.majliss_teacher_villages, public.majliss_recordings, public.profile_media_progress
  FROM anon, authenticated;
GRANT SELECT ON TABLE public.majliss_villages, public.majliss_teachers,
  public.majliss_teacher_villages, public.majliss_recordings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.majliss_villages, public.majliss_teachers,
  public.majliss_teacher_villages, public.majliss_recordings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profile_media_progress TO authenticated;
GRANT ALL ON TABLE public.majliss_villages, public.majliss_teachers,
  public.majliss_teacher_villages, public.majliss_recordings, public.profile_media_progress TO service_role;

CREATE POLICY majliss_villages_public_read ON public.majliss_villages FOR SELECT TO anon
USING (status='published' AND published_at IS NOT NULL);
CREATE POLICY majliss_villages_authenticated_read ON public.majliss_villages FOR SELECT TO authenticated
USING ((status='published' AND published_at IS NOT NULL) OR private.can_manage_learning(organization_id));
CREATE POLICY majliss_villages_admin_insert ON public.majliss_villages FOR INSERT TO authenticated
WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY majliss_villages_admin_update ON public.majliss_villages FOR UPDATE TO authenticated
USING (private.can_manage_learning(organization_id)) WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY majliss_villages_admin_delete ON public.majliss_villages FOR DELETE TO authenticated
USING (private.can_manage_learning(organization_id));

CREATE POLICY majliss_teachers_public_read ON public.majliss_teachers FOR SELECT TO anon
USING (status='published' AND published_at IS NOT NULL);
CREATE POLICY majliss_teachers_authenticated_read ON public.majliss_teachers FOR SELECT TO authenticated
USING ((status='published' AND published_at IS NOT NULL) OR private.can_manage_learning(organization_id));
CREATE POLICY majliss_teachers_admin_insert ON public.majliss_teachers FOR INSERT TO authenticated
WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY majliss_teachers_admin_update ON public.majliss_teachers FOR UPDATE TO authenticated
USING (private.can_manage_learning(organization_id)) WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY majliss_teachers_admin_delete ON public.majliss_teachers FOR DELETE TO authenticated
USING (private.can_manage_learning(organization_id));

CREATE POLICY majliss_teacher_villages_public_read ON public.majliss_teacher_villages FOR SELECT TO anon
USING (
  EXISTS (SELECT 1 FROM public.majliss_villages village WHERE village.id=village_id AND village.status='published' AND village.published_at IS NOT NULL)
  AND EXISTS (SELECT 1 FROM public.majliss_teachers teacher WHERE teacher.id=teacher_id AND teacher.status='published' AND teacher.published_at IS NOT NULL)
);
CREATE POLICY majliss_teacher_villages_authenticated_read ON public.majliss_teacher_villages FOR SELECT TO authenticated
USING (private.can_manage_learning(organization_id) OR (
  EXISTS (SELECT 1 FROM public.majliss_villages village WHERE village.id=village_id AND village.status='published' AND village.published_at IS NOT NULL)
  AND EXISTS (SELECT 1 FROM public.majliss_teachers teacher WHERE teacher.id=teacher_id AND teacher.status='published' AND teacher.published_at IS NOT NULL)
));
CREATE POLICY majliss_teacher_villages_admin_insert ON public.majliss_teacher_villages FOR INSERT TO authenticated
WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY majliss_teacher_villages_admin_update ON public.majliss_teacher_villages FOR UPDATE TO authenticated
USING (private.can_manage_learning(organization_id)) WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY majliss_teacher_villages_admin_delete ON public.majliss_teacher_villages FOR DELETE TO authenticated
USING (private.can_manage_learning(organization_id));

CREATE POLICY majliss_recordings_public_read ON public.majliss_recordings FOR SELECT TO anon
USING (status='published' AND published_at IS NOT NULL AND access_tier='free');
CREATE POLICY majliss_recordings_authenticated_read ON public.majliss_recordings FOR SELECT TO authenticated
USING ((status='published' AND published_at IS NOT NULL AND access_tier='free') OR private.can_manage_learning(organization_id));
CREATE POLICY majliss_recordings_admin_insert ON public.majliss_recordings FOR INSERT TO authenticated
WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY majliss_recordings_admin_update ON public.majliss_recordings FOR UPDATE TO authenticated
USING (private.can_manage_learning(organization_id)) WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY majliss_recordings_admin_delete ON public.majliss_recordings FOR DELETE TO authenticated
USING (private.can_manage_learning(organization_id));

CREATE POLICY profile_media_progress_read ON public.profile_media_progress FOR SELECT TO authenticated
USING (private.can_act_as_profile(profile_id));
CREATE POLICY profile_media_progress_insert ON public.profile_media_progress FOR INSERT TO authenticated
WITH CHECK (actor_user_id=(SELECT auth.uid()) AND private.can_act_as_profile(profile_id));
CREATE POLICY profile_media_progress_update ON public.profile_media_progress FOR UPDATE TO authenticated
USING (actor_user_id=(SELECT auth.uid()) AND private.can_act_as_profile(profile_id))
WITH CHECK (actor_user_id=(SELECT auth.uid()) AND private.can_act_as_profile(profile_id));

-- Real pilot data supplied by the project owner. No recording is invented.
INSERT INTO public.majliss_villages (
  id,organization_id,name,slug,country,description,order_index,status,published_at,created_by
) VALUES (
  '5f358369-17ed-541a-bce1-f162dad14186','390a6abd-8712-490c-8f8d-846165bf9f9f',
  'Touba','touba-guinee','Guinée',NULL,0,'published',now(),'7dffded4-9741-4692-b593-216cc1f4e609'
);
INSERT INTO public.majliss_teachers (
  id,organization_id,display_name,slug,biography,order_index,status,published_at,created_by
) VALUES (
  'c4d2e906-fbb2-55cd-a672-3d81eb1d5bc0','390a6abd-8712-490c-8f8d-846165bf9f9f',
  'Oustaz Banfa Diaby','oustaz-banfa-diaby',NULL,0,'published',now(),'7dffded4-9741-4692-b593-216cc1f4e609'
);
INSERT INTO public.majliss_teacher_villages (
  id,organization_id,teacher_id,village_id,order_index,created_by
) VALUES (
  '4c1db91d-1445-52c0-95d4-57af2dd204af','390a6abd-8712-490c-8f8d-846165bf9f9f',
  'c4d2e906-fbb2-55cd-a672-3d81eb1d5bc0','5f358369-17ed-541a-bce1-f162dad14186',0,
  '7dffded4-9741-4692-b593-216cc1f4e609'
);

UPDATE public.organizations
SET feature_flags=coalesce(feature_flags,'{}'::jsonb)||jsonb_build_object('majliss_v1',false)
WHERE id='390a6abd-8712-490c-8f8d-846165bf9f9f';

COMMENT ON TABLE public.majliss_recordings IS
  'Majliss media catalog; intentionally separate from lessons, sessions and profile_session_progress.';
