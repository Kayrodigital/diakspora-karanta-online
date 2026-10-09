-- M8: canonical, profile-scoped progress for pedagogical sessions.
-- Legacy progress remains untouched and is bridged deterministically below.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.progress AS legacy
    WHERE legacy.user_id IS NULL
       OR legacy.lesson_id IS NULL
       OR legacy.organization_id IS NULL
       OR legacy.status NOT IN ('in_progress', 'completed')
       OR (legacy.status = 'completed' AND legacy.completed_at IS NULL)
       OR (legacy.status = 'in_progress' AND legacy.completed_at IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'M8 preflight: legacy progress contains an unmappable row.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.progress AS legacy
    LEFT JOIN public.profiles AS profile
      ON profile.id = legacy.user_id
     AND profile.organization_id = legacy.organization_id
    LEFT JOIN LATERAL (
      SELECT count(*) AS matches
      FROM public.sessions AS session
      WHERE session.lesson_id = legacy.lesson_id
        AND session.organization_id = legacy.organization_id
    ) AS session_match ON true
    WHERE profile.id IS NULL OR session_match.matches <> 1
  ) THEN
    RAISE EXCEPTION 'M8 preflight: legacy profile/session mapping is not exact.';
  END IF;
END
$$;

CREATE TABLE public.profile_session_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'validated')),
  started_at timestamptz,
  completed_at timestamptz,
  validated_at timestamptz,
  validated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_version integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_session_progress_profile_session_key UNIQUE (profile_id, session_id),
  CONSTRAINT profile_session_progress_version_check
    CHECK (completed_version IS NULL OR completed_version > 0),
  CONSTRAINT profile_session_progress_state_check CHECK (
    (status = 'in_progress'
      AND completed_at IS NULL
      AND validated_at IS NULL
      AND validated_by IS NULL
      AND completed_version IS NULL)
    OR
    (status = 'completed'
      AND completed_at IS NOT NULL
      AND validated_at IS NULL
      AND validated_by IS NULL
      AND completed_version IS NOT NULL)
    OR
    (status = 'validated'
      AND completed_at IS NOT NULL
      AND validated_at IS NOT NULL
      AND validated_by IS NOT NULL
      AND completed_version IS NOT NULL)
  )
);

CREATE INDEX profile_session_progress_organization_idx
  ON public.profile_session_progress(organization_id);
CREATE INDEX profile_session_progress_session_idx
  ON public.profile_session_progress(session_id);
CREATE INDEX profile_session_progress_pending_validation_idx
  ON public.profile_session_progress(session_id, profile_id)
  WHERE status = 'completed';

INSERT INTO public.profile_session_progress (
  id,
  organization_id,
  profile_id,
  session_id,
  status,
  started_at,
  completed_at,
  completed_version,
  created_at,
  updated_at
)
SELECT
  legacy.id,
  legacy.organization_id,
  legacy.user_id,
  session.id,
  legacy.status,
  NULL,
  CASE WHEN legacy.status = 'completed' THEN legacy.completed_at END,
  CASE WHEN legacy.status = 'completed' THEN session.version END,
  COALESCE(legacy.completed_at, now()),
  COALESCE(legacy.completed_at, now())
FROM public.progress AS legacy
JOIN public.sessions AS session
  ON session.lesson_id = legacy.lesson_id
 AND session.organization_id = legacy.organization_id;

CREATE OR REPLACE FUNCTION private.m8_required_activities_complete(
  p_profile_id uuid,
  p_session_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.activities AS activity
    WHERE activity.session_id = p_session_id
      AND activity.status = 'published'
      AND (activity.requires_submission OR activity.requires_validation)
      AND NOT (
        EXISTS (
          SELECT 1
          FROM public.activity_attempts AS attempt
          WHERE attempt.activity_id = activity.id
            AND attempt.profile_id = p_profile_id
            AND attempt.status IN ('completed', 'submitted')
        )
        OR EXISTS (
          SELECT 1
          FROM public.quizzes AS quiz
          JOIN public.quiz_attempts AS attempt ON attempt.quiz_id = quiz.id
          WHERE quiz.activity_id = activity.id
            AND attempt.profile_id = p_profile_id
            AND attempt.status IN ('submitted', 'graded')
        )
        OR EXISTS (
          SELECT 1
          FROM public.homework_submissions AS submission
          WHERE submission.activity_id = activity.id
            AND submission.user_id = p_profile_id
            AND submission.status IN ('submitted', 'reviewed')
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_validate_profile_session(
  p_profile_id uuid,
  p_session_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      JOIN public.sessions AS session
        ON session.id = p_session_id
       AND session.organization_id = profile.organization_id
      JOIN public.lessons AS lesson ON lesson.id = session.lesson_id
      WHERE profile.id = p_profile_id
        AND (
          private.can_manage_learning(profile.organization_id)
          OR EXISTS (
            SELECT 1
            FROM public.learner_cohort_memberships AS learner_membership
            JOIN public.course_cohorts AS course_assignment
              ON course_assignment.cohort_id = learner_membership.cohort_id
             AND course_assignment.organization_id = learner_membership.organization_id
             AND course_assignment.course_id = lesson.course_id
            JOIN public.cohorts AS cohort ON cohort.id = learner_membership.cohort_id
            WHERE learner_membership.profile_id = profile.id
              AND learner_membership.status = 'active'
              AND (
                EXISTS (
                  SELECT 1
                  FROM public.cohort_memberships AS staff_membership
                  WHERE staff_membership.cohort_id = learner_membership.cohort_id
                    AND staff_membership.organization_id = learner_membership.organization_id
                    AND staff_membership.user_id = (SELECT auth.uid())
                    AND staff_membership.status = 'active'
                    AND staff_membership.role IN ('teacher', 'class_manager')
                )
                OR EXISTS (
                  SELECT 1
                  FROM public.profiles AS teacher_profile
                  WHERE teacher_profile.id = cohort.teacher_id
                    AND teacher_profile.organization_id = cohort.organization_id
                    AND teacher_profile.auth_user_id = (SELECT auth.uid())
                )
              )
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION private.m8_guard_profile_session_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session public.sessions%ROWTYPE;
  v_profile_organization uuid;
  v_actor uuid := (SELECT auth.uid());
  v_can_act boolean;
  v_can_validate boolean;
BEGIN
  SELECT organization_id INTO v_profile_organization
  FROM public.profiles
  WHERE id = NEW.profile_id;

  SELECT * INTO v_session
  FROM public.sessions
  WHERE id = NEW.session_id;

  IF v_profile_organization IS NULL OR v_session.id IS NULL THEN
    RAISE EXCEPTION 'M8 progress requires an existing profile and session.' USING ERRCODE = '23503';
  END IF;
  IF NEW.organization_id IS DISTINCT FROM v_profile_organization
     OR NEW.organization_id IS DISTINCT FROM v_session.organization_id THEN
    RAISE EXCEPTION 'M8 progress cannot cross organizations.' USING ERRCODE = '23514';
  END IF;
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'M8 progress mutations require an authenticated actor.' USING ERRCODE = '42501';
  END IF;

  v_can_act := private.can_act_as_profile(NEW.profile_id);
  v_can_validate := private.can_validate_profile_session(NEW.profile_id, NEW.session_id);

  IF TG_OP = 'INSERT' THEN
    IF NOT v_can_act OR NEW.status <> 'in_progress' THEN
      RAISE EXCEPTION 'M8 progress may only be started by the learner or linked parent.' USING ERRCODE = '42501';
    END IF;
    NEW.started_at := COALESCE(NEW.started_at, now());
    NEW.completed_at := NULL;
    NEW.validated_at := NULL;
    NEW.validated_by := NULL;
    NEW.completed_version := NULL;
  ELSE
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.profile_id IS DISTINCT FROM OLD.profile_id
       OR NEW.session_id IS DISTINCT FROM OLD.session_id
       OR NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'M8 progress identity is immutable.' USING ERRCODE = '23514';
    END IF;
    NEW.created_at := OLD.created_at;

    IF NEW.status = 'validated' THEN
      IF NOT v_can_validate
         OR OLD.status <> 'completed'
         OR v_session.requires_validation IS NOT TRUE THEN
        RAISE EXCEPTION 'M8 validation is not authorized for this actor and class.' USING ERRCODE = '42501';
      END IF;
      NEW.started_at := OLD.started_at;
      NEW.completed_at := OLD.completed_at;
      NEW.completed_version := OLD.completed_version;
      NEW.validated_at := now();
      NEW.validated_by := v_actor;
    ELSE
      IF NOT v_can_act OR NEW.status NOT IN ('in_progress', 'completed') THEN
        RAISE EXCEPTION 'M8 learner progress transition is not authorized.' USING ERRCODE = '42501';
      END IF;
      IF OLD.status IN ('completed', 'validated') AND NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'M8 completed progress cannot be downgraded.' USING ERRCODE = '23514';
      END IF;
      NEW.started_at := COALESCE(OLD.started_at, NEW.started_at, now());
      NEW.validated_at := NULL;
      NEW.validated_by := NULL;
      IF NEW.status = 'completed' AND OLD.status = 'in_progress' THEN
        IF NOT private.m8_required_activities_complete(NEW.profile_id, NEW.session_id) THEN
          RAISE EXCEPTION 'M8 required activities must be completed first.' USING ERRCODE = '23514';
        END IF;
        NEW.completed_at := now();
        NEW.completed_version := v_session.version;
      ELSE
        NEW.completed_at := OLD.completed_at;
        NEW.completed_version := OLD.completed_version;
      END IF;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION private.m8_required_activities_complete(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.can_validate_profile_session(uuid, uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION private.can_validate_profile_session(uuid, uuid)
  TO authenticated;
REVOKE ALL ON FUNCTION private.m8_guard_profile_session_progress()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER m8_guard_profile_session_progress
BEFORE INSERT OR UPDATE ON public.profile_session_progress
FOR EACH ROW EXECUTE FUNCTION private.m8_guard_profile_session_progress();

ALTER TABLE public.profile_session_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_session_progress FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profile_session_progress TO authenticated;
GRANT ALL ON public.profile_session_progress TO service_role;

CREATE POLICY profile_session_progress_read
ON public.profile_session_progress
FOR SELECT TO authenticated
USING (
  (SELECT private.can_act_as_profile(profile_id))
  OR (SELECT private.can_validate_profile_session(profile_id, session_id))
);

CREATE POLICY profile_session_progress_insert
ON public.profile_session_progress
FOR INSERT TO authenticated
WITH CHECK (
  status = 'in_progress'
  AND (SELECT private.can_act_as_profile(profile_id))
);

CREATE POLICY profile_session_progress_update
ON public.profile_session_progress
FOR UPDATE TO authenticated
USING (
  (SELECT private.can_act_as_profile(profile_id))
  OR (SELECT private.can_validate_profile_session(profile_id, session_id))
)
WITH CHECK (
  (SELECT private.can_act_as_profile(profile_id))
  OR (SELECT private.can_validate_profile_session(profile_id, session_id))
);

UPDATE public.organizations
SET feature_flags = COALESCE(feature_flags, '{}'::jsonb)
  || jsonb_build_object('progress_v1', false)
WHERE id = '390a6abd-8712-490c-8f8d-846165bf9f9f'
  AND slug = 'diakspora';

DO $$
BEGIN
  IF (SELECT count(*) FROM public.profile_session_progress)
     <> (SELECT count(*) FROM public.progress) THEN
    RAISE EXCEPTION 'M8 backfill did not preserve every legacy progress row.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.progress AS legacy
    JOIN public.profile_session_progress AS canonical ON canonical.id = legacy.id
    JOIN public.sessions AS session ON session.id = canonical.session_id
    WHERE canonical.profile_id IS DISTINCT FROM legacy.user_id
       OR session.lesson_id IS DISTINCT FROM legacy.lesson_id
       OR canonical.organization_id IS DISTINCT FROM legacy.organization_id
       OR canonical.status IS DISTINCT FROM legacy.status
       OR (legacy.status = 'completed' AND canonical.completed_at IS DISTINCT FROM legacy.completed_at)
  ) THEN
    RAISE EXCEPTION 'M8 backfill changed legacy progress semantics.';
  END IF;
END
$$;
