-- Scope teaching staff to the classes they are explicitly responsible for.
-- Organization administrators and pedagogical managers keep organization-wide access.

CREATE OR REPLACE FUNCTION private.can_teach_cohort(p_cohort_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cohorts AS cohort
    WHERE cohort.id = p_cohort_id
      AND (
        private.has_organization_role(
          cohort.organization_id,
          ARRAY['owner', 'admin', 'technician', 'pedagogical_manager']
        )
        OR cohort.teacher_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.cohort_memberships AS membership
          WHERE membership.cohort_id = cohort.id
            AND membership.user_id = (SELECT auth.uid())
            AND membership.status = 'active'
            AND membership.role IN ('class_manager', 'assistant_teacher')
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_teach_course(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses AS course
    WHERE course.id = p_course_id
      AND (
        private.has_organization_role(
          course.organization_id,
          ARRAY['owner', 'admin', 'technician', 'pedagogical_manager']
        )
        OR EXISTS (
          SELECT 1
          FROM public.course_cohorts AS assignment
          WHERE assignment.course_id = course.id
            AND private.can_teach_cohort(assignment.cohort_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_teach_learner(p_learner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.learner_profiles AS learner
    WHERE learner.id = p_learner_id
      AND (
        private.has_organization_role(
          learner.organization_id,
          ARRAY['owner', 'admin', 'technician', 'pedagogical_manager']
        )
        OR EXISTS (
          SELECT 1
          FROM public.learner_cohort_memberships AS membership
          WHERE membership.learner_id = learner.id
            AND membership.status = 'active'
            AND private.can_teach_cohort(membership.cohort_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_teach_user(
  p_organization_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.learner_profiles AS learner
    WHERE learner.organization_id = p_organization_id
      AND learner.user_id = p_user_id
      AND private.can_teach_learner(learner.id)
  );
$$;

REVOKE ALL ON FUNCTION private.can_teach_cohort(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_teach_course(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_teach_learner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_teach_user(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_teach_cohort(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_teach_course(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_teach_learner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_teach_user(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.can_manage_learning(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.has_organization_role(
    p_organization_id,
    ARRAY['owner', 'admin', 'technician', 'pedagogical_manager']
  );
$$;

CREATE OR REPLACE FUNCTION private.can_access_course(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses AS course
    WHERE course.id = p_course_id
      AND (
        private.can_teach_course(course.id)
        OR (
          course.status = 'published'
          AND private.is_organization_member(course.organization_id)
          AND (
            course.access_scope = 'organization'
            OR EXISTS (
              SELECT 1
              FROM public.course_enrollments AS enrollment
              WHERE enrollment.course_id = course.id
                AND enrollment.user_id = (SELECT auth.uid())
                AND enrollment.status IN ('active', 'completed')
            )
            OR EXISTS (
              SELECT 1
              FROM public.course_cohorts AS assignment
              JOIN public.cohort_memberships AS membership
                ON membership.cohort_id = assignment.cohort_id
              WHERE assignment.course_id = course.id
                AND membership.user_id = (SELECT auth.uid())
                AND membership.status IN ('active', 'completed')
            )
          )
        )
      )
  );
$$;

DROP POLICY IF EXISTS cohorts_read_for_organization_members ON public.cohorts;
CREATE POLICY cohorts_read_for_authorized_members
  ON public.cohorts
  FOR SELECT
  TO authenticated
  USING (
    private.can_teach_cohort(id)
    OR EXISTS (
      SELECT 1
      FROM public.cohort_memberships AS membership
      WHERE membership.cohort_id = cohorts.id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.status IN ('active', 'completed')
    )
    OR EXISTS (
      SELECT 1
      FROM public.learner_cohort_memberships AS membership
      JOIN public.learner_profiles AS learner ON learner.id = membership.learner_id
      WHERE membership.cohort_id = cohorts.id
        AND membership.status = 'active'
        AND (
          learner.user_id = (SELECT auth.uid())
          OR learner.guardian_user_id = (SELECT auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS cohorts_insert_for_staff ON public.cohorts;
DROP POLICY IF EXISTS cohorts_update_for_staff ON public.cohorts;
DROP POLICY IF EXISTS cohorts_delete_for_staff ON public.cohorts;
CREATE POLICY cohorts_insert_for_managers
  ON public.cohorts FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY cohorts_update_for_managers
  ON public.cohorts FOR UPDATE TO authenticated
  USING (private.can_manage_learning(organization_id))
  WITH CHECK (private.can_manage_learning(organization_id));
CREATE POLICY cohorts_delete_for_managers
  ON public.cohorts FOR DELETE TO authenticated
  USING (private.can_manage_learning(organization_id));

DROP POLICY IF EXISTS learner_profiles_read ON public.learner_profiles;
CREATE POLICY learner_profiles_read
  ON public.learner_profiles
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR guardian_user_id = (SELECT auth.uid())
    OR private.can_teach_learner(id)
    OR private.is_platform_administrator()
  );

DROP POLICY IF EXISTS learner_cohort_memberships_read ON public.learner_cohort_memberships;
CREATE POLICY learner_cohort_memberships_read
  ON public.learner_cohort_memberships
  FOR SELECT
  TO authenticated
  USING (
    private.can_teach_cohort(cohort_id)
    OR EXISTS (
      SELECT 1
      FROM public.learner_profiles AS learner
      WHERE learner.id = learner_id
        AND (
          learner.user_id = (SELECT auth.uid())
          OR learner.guardian_user_id = (SELECT auth.uid())
        )
    )
    OR private.is_platform_administrator()
  );

DROP POLICY IF EXISTS profiles_read_organization_staff ON public.profiles;
CREATE POLICY profiles_read_organization_managers
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_memberships AS target_membership
      WHERE target_membership.user_id = profiles.id
        AND target_membership.status IN ('active', 'invited', 'suspended')
        AND (
          private.has_organization_role(
            target_membership.organization_id,
            ARRAY['owner', 'admin', 'technician', 'pedagogical_manager']
          )
          OR private.is_platform_administrator()
        )
    )
  );

DROP POLICY IF EXISTS progress_read_own_or_staff ON public.progress;
CREATE POLICY progress_read_own_family_or_teacher
  ON public.progress
  FOR SELECT
  TO authenticated
  USING (
    private.is_organization_member(organization_id)
    AND (
      user_id = (SELECT auth.uid())
      OR private.is_linked_parent(organization_id, user_id)
      OR private.can_manage_learning(organization_id)
      OR private.can_teach_user(organization_id, user_id)
    )
  );

DROP POLICY IF EXISTS quiz_attempts_read ON public.quiz_attempts;
CREATE POLICY quiz_attempts_read
  ON public.quiz_attempts
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR private.is_linked_parent(organization_id, user_id)
    OR private.can_manage_learning(organization_id)
    OR private.can_teach_user(organization_id, user_id)
  );

DROP POLICY IF EXISTS homework_read_own_or_staff ON public.homework_submissions;
CREATE POLICY homework_read_own_family_or_teacher
  ON public.homework_submissions
  FOR SELECT
  TO authenticated
  USING (
    private.is_organization_member(organization_id)
    AND (
      user_id = (SELECT auth.uid())
      OR private.is_linked_parent(organization_id, user_id)
      OR private.can_manage_learning(organization_id)
      OR private.can_teach_user(organization_id, user_id)
    )
  );

DROP POLICY IF EXISTS homework_update_own_or_staff ON public.homework_submissions;
CREATE POLICY homework_update_for_assigned_teachers
  ON public.homework_submissions
  FOR UPDATE
  TO authenticated
  USING (
    private.can_manage_learning(organization_id)
    OR private.can_teach_user(organization_id, user_id)
  )
  WITH CHECK (
    private.can_manage_learning(organization_id)
    OR private.can_teach_user(organization_id, user_id)
  );

DROP POLICY IF EXISTS live_sessions_read ON public.live_sessions;
CREATE POLICY live_sessions_read
  ON public.live_sessions
  FOR SELECT
  TO authenticated
  USING (
    private.can_manage_learning(organization_id)
    OR (cohort_id IS NOT NULL AND private.can_teach_cohort(cohort_id))
    OR (course_id IS NOT NULL AND private.can_access_course(course_id))
    OR (
      course_id IS NULL
      AND cohort_id IS NULL
      AND private.is_organization_member(organization_id)
    )
  );

DROP POLICY IF EXISTS live_sessions_insert ON public.live_sessions;
DROP POLICY IF EXISTS live_sessions_update ON public.live_sessions;
DROP POLICY IF EXISTS live_sessions_delete ON public.live_sessions;
CREATE POLICY live_sessions_insert
  ON public.live_sessions FOR INSERT TO authenticated
  WITH CHECK (
    private.can_manage_learning(organization_id)
    OR (
      cohort_id IS NOT NULL
      AND private.can_teach_cohort(cohort_id)
      AND (host_user_id IS NULL OR host_user_id = (SELECT auth.uid()))
    )
  );
CREATE POLICY live_sessions_update
  ON public.live_sessions FOR UPDATE TO authenticated
  USING (
    private.can_manage_learning(organization_id)
    OR (cohort_id IS NOT NULL AND private.can_teach_cohort(cohort_id))
  )
  WITH CHECK (
    private.can_manage_learning(organization_id)
    OR (
      cohort_id IS NOT NULL
      AND private.can_teach_cohort(cohort_id)
      AND (host_user_id IS NULL OR host_user_id = (SELECT auth.uid()))
    )
  );
CREATE POLICY live_sessions_delete
  ON public.live_sessions FOR DELETE TO authenticated
  USING (
    private.can_manage_learning(organization_id)
    OR (cohort_id IS NOT NULL AND private.can_teach_cohort(cohort_id))
  );

DROP POLICY IF EXISTS quiz_option_keys_read ON public.quiz_option_keys;
CREATE POLICY quiz_option_keys_read_for_teaching_staff
  ON public.quiz_option_keys
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.quiz_options AS option
      JOIN public.quiz_questions AS question ON question.id = option.question_id
      JOIN public.quizzes AS quiz ON quiz.id = question.quiz_id
      JOIN public.lessons AS lesson ON lesson.id = quiz.lesson_id
      WHERE option.id = quiz_option_keys.option_id
        AND lesson.course_id IS NOT NULL
        AND private.can_teach_course(lesson.course_id)
    )
  );
