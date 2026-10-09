-- M7: canonical session resources and learning activities.
-- Legacy lesson, quiz and homework links remain present and unchanged.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.lesson_resources AS resource
    LEFT JOIN LATERAL (
      SELECT count(*) AS matches
      FROM public.sessions AS session
      WHERE session.lesson_id = resource.lesson_id
        AND session.organization_id = resource.organization_id
    ) AS mapping ON true
    WHERE mapping.matches <> 1
  ) THEN
    RAISE EXCEPTION 'M7 preflight: a lesson resource has no unique session mapping.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.quizzes AS quiz
    LEFT JOIN LATERAL (
      SELECT count(*) AS matches
      FROM public.sessions AS session
      WHERE session.lesson_id = quiz.lesson_id
        AND session.organization_id = quiz.organization_id
    ) AS mapping ON true
    WHERE mapping.matches <> 1
  ) THEN
    RAISE EXCEPTION 'M7 preflight: a quiz has no unique session mapping.';
  END IF;
END
$$;

CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  legacy_quiz_id uuid UNIQUE REFERENCES public.quizzes(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  instructions text,
  activity_type text NOT NULL
    CHECK (activity_type IN ('quiz', 'exercise', 'training', 'submission', 'final_assessment')),
  correction_mode text NOT NULL
    CHECK (correction_mode IN ('automatic', 'self_correction', 'collective', 'teacher')),
  requires_submission boolean NOT NULL DEFAULT false,
  requires_validation boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published', 'archived')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, order_index),
  UNIQUE (id, organization_id),
  CONSTRAINT activities_session_same_organization
    FOREIGN KEY (session_id, organization_id)
    REFERENCES public.sessions(id, organization_id)
);

ALTER TABLE public.lesson_resources
  ADD COLUMN session_id uuid,
  ADD COLUMN access_tier text
    CHECK (access_tier IS NULL OR access_tier IN ('free', 'premium')),
  ADD COLUMN source_type text,
  ADD COLUMN source_name text,
  ADD COLUMN author_name text,
  ADD COLUMN provenance text,
  ADD COLUMN distribution_authorized boolean,
  ADD COLUMN license_type text,
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  ADD COLUMN published_at timestamptz,
  ADD COLUMN correction_activity_id uuid,
  ADD CONSTRAINT lesson_resources_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE RESTRICT,
  ADD CONSTRAINT lesson_resources_session_same_organization
    FOREIGN KEY (session_id, organization_id)
    REFERENCES public.sessions(id, organization_id),
  ADD CONSTRAINT lesson_resources_correction_activity_id_fkey
    FOREIGN KEY (correction_activity_id) REFERENCES public.activities(id) ON DELETE SET NULL,
  ADD CONSTRAINT lesson_resources_correction_activity_same_organization
    FOREIGN KEY (correction_activity_id, organization_id)
    REFERENCES public.activities(id, organization_id);

UPDATE public.lesson_resources AS resource
SET session_id = session.id
FROM public.sessions AS session
WHERE session.lesson_id = resource.lesson_id
  AND session.organization_id = resource.organization_id;

ALTER TABLE public.lesson_resources ALTER COLUMN session_id SET NOT NULL;

CREATE INDEX lesson_resources_session_order_idx
  ON public.lesson_resources (session_id, order_index);
CREATE INDEX lesson_resources_correction_activity_idx
  ON public.lesson_resources (correction_activity_id)
  WHERE correction_activity_id IS NOT NULL;

-- A legacy quiz becomes one canonical automatic activity. Reusing its UUID
-- keeps the mapping deterministic without modifying the quiz UUID.
INSERT INTO public.activities (
  id, organization_id, session_id, legacy_quiz_id, title, instructions,
  activity_type, correction_mode, requires_submission, requires_validation,
  order_index, status, created_by, published_at, created_at, updated_at
)
SELECT
  quiz.id,
  quiz.organization_id,
  session.id,
  quiz.id,
  quiz.title,
  quiz.description,
  'quiz',
  'automatic',
  true,
  true,
  row_number() OVER (PARTITION BY session.id ORDER BY quiz.created_at, quiz.id) - 1,
  CASE quiz.status WHEN 'published' THEN 'published' WHEN 'archived' THEN 'archived' ELSE 'draft' END,
  quiz.created_by,
  CASE WHEN quiz.status = 'published' THEN quiz.created_at END,
  quiz.created_at,
  quiz.updated_at
FROM public.quizzes AS quiz
JOIN public.sessions AS session
  ON session.lesson_id = quiz.lesson_id
 AND session.organization_id = quiz.organization_id;

ALTER TABLE public.quizzes
  ADD COLUMN activity_id uuid,
  ADD CONSTRAINT quizzes_activity_id_fkey
    FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE RESTRICT,
  ADD CONSTRAINT quizzes_activity_same_organization
    FOREIGN KEY (activity_id, organization_id)
    REFERENCES public.activities(id, organization_id);

UPDATE public.quizzes SET activity_id = id;
ALTER TABLE public.quizzes ALTER COLUMN activity_id SET NOT NULL;
CREATE UNIQUE INDEX quizzes_activity_id_unique_idx ON public.quizzes (activity_id);

ALTER TABLE public.homework_submissions
  ADD COLUMN activity_id uuid,
  ADD CONSTRAINT homework_submissions_activity_id_fkey
    FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE SET NULL,
  ADD CONSTRAINT homework_submissions_activity_same_organization
    FOREIGN KEY (activity_id, organization_id)
    REFERENCES public.activities(id, organization_id);
CREATE INDEX homework_submissions_activity_idx
  ON public.homework_submissions (activity_id) WHERE activity_id IS NOT NULL;

CREATE TABLE public.activity_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'submitted')),
  self_evaluation text
    CHECK (self_evaluation IS NULL OR self_evaluation IN ('understood', 'review')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (activity_id, profile_id),
  CONSTRAINT activity_attempts_activity_same_organization
    FOREIGN KEY (activity_id, organization_id)
    REFERENCES public.activities(id, organization_id),
  CONSTRAINT activity_attempts_state_check CHECK (
    (status = 'in_progress' AND completed_at IS NULL AND submitted_at IS NULL)
    OR (status = 'completed' AND completed_at IS NOT NULL)
    OR (status = 'submitted' AND submitted_at IS NOT NULL)
  )
);

CREATE INDEX activities_session_status_order_idx
  ON public.activities (session_id, status, order_index);
CREATE INDEX activity_attempts_profile_status_idx
  ON public.activity_attempts (profile_id, status);

CREATE OR REPLACE FUNCTION private.set_m7_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION private.bridge_resource_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  mapped_session_id uuid;
BEGIN
  SELECT session.id INTO STRICT mapped_session_id
  FROM public.sessions AS session
  WHERE session.lesson_id = NEW.lesson_id
    AND session.organization_id = NEW.organization_id;

  IF NEW.session_id IS NULL THEN
    NEW.session_id := mapped_session_id;
  ELSIF NEW.session_id IS DISTINCT FROM mapped_session_id THEN
    RAISE EXCEPTION 'Resource session does not match its legacy lesson.';
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION private.bridge_quiz_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  mapped_session_id uuid;
  mapped_activity_id uuid;
  next_order integer;
BEGIN
  SELECT session.id INTO STRICT mapped_session_id
  FROM public.sessions AS session
  WHERE session.lesson_id = NEW.lesson_id
    AND session.organization_id = NEW.organization_id;

  IF NEW.activity_id IS NULL THEN
    mapped_activity_id := NEW.id;
    SELECT coalesce(max(activity.order_index) + 1, 0) INTO next_order
    FROM public.activities AS activity
    WHERE activity.session_id = mapped_session_id;

    INSERT INTO public.activities (
      id, organization_id, session_id, legacy_quiz_id, title, instructions,
      activity_type, correction_mode, requires_submission, requires_validation,
      order_index, status, created_by, published_at, created_at, updated_at
    ) VALUES (
      mapped_activity_id, NEW.organization_id, mapped_session_id, NEW.id,
      NEW.title, NEW.description, 'quiz', 'automatic', true, true,
      next_order,
      CASE NEW.status WHEN 'published' THEN 'published' WHEN 'archived' THEN 'archived' ELSE 'draft' END,
      NEW.created_by,
      CASE WHEN NEW.status = 'published' THEN NEW.created_at END,
      NEW.created_at, NEW.updated_at
    );
    UPDATE public.quizzes
    SET activity_id = mapped_activity_id
    WHERE id = NEW.id;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.activities AS activity
      WHERE activity.id = NEW.activity_id
        AND activity.legacy_quiz_id = NEW.id
        AND activity.session_id = mapped_session_id
        AND activity.organization_id = NEW.organization_id
        AND activity.activity_type = 'quiz'
    ) THEN
      RAISE EXCEPTION 'Quiz activity does not match its canonical session.';
    END IF;
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION private.guard_activity_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = NEW.profile_id
      AND profile.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Attempt profile and organization are inconsistent.';
  END IF;

  IF TG_OP = 'UPDATE' AND (
    NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.activity_id IS DISTINCT FROM OLD.activity_id
    OR NEW.profile_id IS DISTINCT FROM OLD.profile_id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
  ) THEN
    RAISE EXCEPTION 'Attempt identity fields are immutable.';
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION private.sync_quiz_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.activities
  SET title = NEW.title,
      instructions = NEW.description,
      status = CASE NEW.status
        WHEN 'published' THEN 'published'
        WHEN 'archived' THEN 'archived'
        ELSE 'draft'
      END,
      published_at = CASE
        WHEN NEW.status = 'published' THEN coalesce(published_at, now())
        ELSE NULL
      END
  WHERE id = NEW.activity_id
    AND legacy_quiz_id = NEW.id;
  RETURN NEW;
END
$$;

CREATE TRIGGER activities_set_updated_at
BEFORE UPDATE ON public.activities
FOR EACH ROW EXECUTE FUNCTION private.set_m7_updated_at();
CREATE TRIGGER activity_attempts_set_updated_at
BEFORE UPDATE ON public.activity_attempts
FOR EACH ROW EXECUTE FUNCTION private.set_m7_updated_at();
CREATE TRIGGER lesson_resources_bridge_session
BEFORE INSERT OR UPDATE OF lesson_id, session_id, organization_id ON public.lesson_resources
FOR EACH ROW EXECUTE FUNCTION private.bridge_resource_session();
CREATE TRIGGER quizzes_bridge_activity
AFTER INSERT ON public.quizzes
FOR EACH ROW EXECUTE FUNCTION private.bridge_quiz_activity();
CREATE TRIGGER quizzes_sync_activity
AFTER UPDATE OF title, description, status ON public.quizzes
FOR EACH ROW EXECUTE FUNCTION private.sync_quiz_activity();
CREATE TRIGGER activity_attempts_guard
BEFORE INSERT OR UPDATE ON public.activity_attempts
FOR EACH ROW EXECUTE FUNCTION private.guard_activity_attempt();

CREATE OR REPLACE FUNCTION private.can_view_activity(p_activity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.activities AS activity
    JOIN public.sessions AS session ON session.id = activity.session_id
    WHERE activity.id = p_activity_id
      AND (
        private.can_manage_learning(activity.organization_id)
        OR (
          activity.status = 'published'
          AND session.status = 'published'
          AND private.can_access_lesson(session.lesson_id)
        )
        OR (
          activity.status = 'draft'
          AND activity.created_by = (SELECT auth.uid())
          AND private.can_edit_lesson(session.lesson_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_edit_activity(p_activity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.activities AS activity
    JOIN public.sessions AS session ON session.id = activity.session_id
    WHERE activity.id = p_activity_id
      AND (
        private.can_manage_learning(activity.organization_id)
        OR (
          activity.status = 'draft'
          AND activity.created_by = (SELECT auth.uid())
          AND private.can_edit_lesson(session.lesson_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_view_session_resource(p_resource_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lesson_resources AS resource
    WHERE resource.id = p_resource_id
      AND (
        private.can_edit_lesson(resource.lesson_id)
        OR (
          resource.status = 'active'
          AND resource.access_tier IS DISTINCT FROM 'premium'
          AND private.can_access_lesson(resource.lesson_id)
          AND (
            resource.correction_activity_id IS NULL
            OR EXISTS (
              SELECT 1
              FROM public.activity_attempts AS attempt
              WHERE attempt.activity_id = resource.correction_activity_id
                AND (
                  attempt.user_id = (SELECT auth.uid())
                  OR private.can_act_as_profile(attempt.profile_id)
                )
                AND attempt.status IN ('completed', 'submitted')
            )
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION private.set_m7_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.bridge_resource_session() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.bridge_quiz_activity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.guard_activity_attempt() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.sync_quiz_activity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.can_view_activity(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.can_edit_activity(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.can_view_session_resource(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_activity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_edit_activity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_session_resource(uuid) TO authenticated;

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.activities, public.activity_attempts FROM anon, authenticated;
GRANT SELECT ON TABLE public.activities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.activities TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.activity_attempts TO authenticated;
GRANT SELECT ON TABLE public.lesson_resources TO anon;
GRANT ALL ON TABLE public.activities, public.activity_attempts TO service_role;

CREATE POLICY activities_read_public
ON public.activities FOR SELECT TO anon
USING (
  status = 'published'
  AND EXISTS (
    SELECT 1 FROM public.sessions AS session
    WHERE session.id = activities.session_id AND session.status = 'published'
  )
);
CREATE POLICY activities_read_authenticated
ON public.activities FOR SELECT TO authenticated
USING (private.can_view_activity(id));
CREATE POLICY activities_insert
ON public.activities FOR INSERT TO authenticated
WITH CHECK (
  private.can_manage_learning(organization_id)
  OR (
    status = 'draft'
    AND created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.sessions AS session
      WHERE session.id = activities.session_id
        AND private.can_edit_lesson(session.lesson_id)
    )
  )
);
CREATE POLICY activities_update
ON public.activities FOR UPDATE TO authenticated
USING (private.can_edit_activity(id))
WITH CHECK (
  private.can_manage_learning(organization_id)
  OR (status = 'draft' AND created_by = (SELECT auth.uid()))
);
CREATE POLICY activities_delete
ON public.activities FOR DELETE TO authenticated
USING (private.can_edit_activity(id));

CREATE POLICY activity_attempts_read
ON public.activity_attempts FOR SELECT TO authenticated
USING (
  private.can_act_as_profile(profile_id)
  OR private.can_manage_learning(organization_id)
  OR private.can_teach_profile(profile_id)
);
CREATE POLICY activity_attempts_insert
ON public.activity_attempts FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND private.can_act_as_profile(profile_id)
  AND private.can_view_activity(activity_id)
);
CREATE POLICY activity_attempts_update
ON public.activity_attempts FOR UPDATE TO authenticated
USING (
  (user_id = (SELECT auth.uid()) AND private.can_act_as_profile(profile_id))
  OR private.can_manage_learning(organization_id)
  OR private.can_teach_profile(profile_id)
)
WITH CHECK (
  (user_id = (SELECT auth.uid()) AND private.can_act_as_profile(profile_id))
  OR private.can_manage_learning(organization_id)
  OR private.can_teach_profile(profile_id)
);

DROP POLICY lesson_resources_read ON public.lesson_resources;
CREATE POLICY lesson_resources_read_authenticated
ON public.lesson_resources FOR SELECT TO authenticated
USING (private.can_view_session_resource(id));
CREATE POLICY lesson_resources_read_public
ON public.lesson_resources FOR SELECT TO anon
USING (
  status = 'active'
  AND access_tier = 'free'
  AND distribution_authorized IS TRUE
  AND published_at IS NOT NULL
  AND correction_activity_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.sessions AS session
    WHERE session.id = lesson_resources.session_id
      AND session.status = 'published'
  )
);

DROP POLICY homework_insert_own ON public.homework_submissions;
CREATE POLICY homework_insert_own
ON public.homework_submissions FOR INSERT TO authenticated
WITH CHECK (
  private.can_act_as_profile(user_id)
  AND EXISTS (
    SELECT 1 FROM public.profiles AS profile
    WHERE profile.id = homework_submissions.user_id
      AND profile.organization_id = homework_submissions.organization_id
  )
  AND (
    activity_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.activities AS activity
      WHERE activity.id = homework_submissions.activity_id
        AND activity.organization_id = homework_submissions.organization_id
        AND activity.activity_type IN ('submission', 'final_assessment')
        AND private.can_view_activity(activity.id)
    )
  )
);

UPDATE public.organizations
SET feature_flags = coalesce(feature_flags, '{}'::jsonb)
  || jsonb_build_object('activities_v1', false)
WHERE id = '390a6abd-8712-490c-8f8d-846165bf9f9f'
  AND slug = 'diakspora';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.lesson_resources AS resource
    JOIN public.sessions AS session ON session.id = resource.session_id
    WHERE session.lesson_id IS DISTINCT FROM resource.lesson_id
       OR session.organization_id IS DISTINCT FROM resource.organization_id
  ) OR EXISTS (
    SELECT 1 FROM public.quizzes AS quiz
    JOIN public.activities AS activity ON activity.id = quiz.activity_id
    JOIN public.sessions AS session ON session.id = activity.session_id
    WHERE activity.legacy_quiz_id IS DISTINCT FROM quiz.id
       OR session.lesson_id IS DISTINCT FROM quiz.lesson_id
       OR activity.organization_id IS DISTINCT FROM quiz.organization_id
  ) THEN
    RAISE EXCEPTION 'M7 postflight: canonical bridge invariant failed.';
  END IF;
END
$$;
