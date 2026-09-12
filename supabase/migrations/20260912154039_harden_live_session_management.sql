-- Keep live-session audiences scoped to the selected class or course.
-- A class takes precedence when both a class and a course are attached.

ALTER TABLE public.live_sessions
  ADD CONSTRAINT live_sessions_title_not_blank
    CHECK (char_length(btrim(title)) BETWEEN 2 AND 180),
  ADD CONSTRAINT live_sessions_valid_time_range
    CHECK (ends_at IS NULL OR ends_at > starts_at),
  ADD CONSTRAINT live_sessions_join_url_http
    CHECK (join_url IS NULL OR join_url ~* '^https?://'),
  ADD CONSTRAINT live_sessions_replay_url_http
    CHECK (replay_url IS NULL OR replay_url ~* '^https?://');

CREATE INDEX live_sessions_organization_status_start_idx
  ON public.live_sessions (organization_id, status, starts_at);

DROP POLICY IF EXISTS live_sessions_read ON public.live_sessions;
CREATE POLICY live_sessions_read
  ON public.live_sessions
  FOR SELECT
  TO authenticated
  USING (
    private.can_manage_learning(organization_id)
    OR (
      cohort_id IS NOT NULL
      AND (
        private.can_teach_cohort(cohort_id)
        OR EXISTS (
          SELECT 1
          FROM public.learner_cohort_memberships AS learner_membership
          JOIN public.learner_profiles AS learner
            ON learner.id = learner_membership.learner_id
          WHERE learner_membership.cohort_id = live_sessions.cohort_id
            AND learner_membership.status = 'active'
            AND (
              learner.user_id = (SELECT auth.uid())
              OR learner.guardian_user_id = (SELECT auth.uid())
            )
        )
        OR EXISTS (
          SELECT 1
          FROM public.cohort_memberships AS staff_membership
          WHERE staff_membership.cohort_id = live_sessions.cohort_id
            AND staff_membership.user_id = (SELECT auth.uid())
            AND staff_membership.status = 'active'
        )
      )
    )
    OR (
      cohort_id IS NULL
      AND course_id IS NOT NULL
      AND private.can_access_course(course_id)
    )
    OR (
      cohort_id IS NULL
      AND course_id IS NULL
      AND private.is_organization_member(organization_id)
    )
  );

DROP POLICY IF EXISTS live_sessions_insert ON public.live_sessions;
CREATE POLICY live_sessions_insert
  ON public.live_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.can_manage_learning(organization_id)
    OR (
      cohort_id IS NOT NULL
      AND private.can_teach_cohort(cohort_id)
      AND (course_id IS NULL OR private.can_teach_course(course_id))
      AND (host_user_id IS NULL OR host_user_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS live_sessions_update ON public.live_sessions;
CREATE POLICY live_sessions_update
  ON public.live_sessions
  FOR UPDATE
  TO authenticated
  USING (
    private.can_manage_learning(organization_id)
    OR (cohort_id IS NOT NULL AND private.can_teach_cohort(cohort_id))
  )
  WITH CHECK (
    private.can_manage_learning(organization_id)
    OR (
      cohort_id IS NOT NULL
      AND private.can_teach_cohort(cohort_id)
      AND (course_id IS NULL OR private.can_teach_course(course_id))
      AND (host_user_id IS NULL OR host_user_id = (SELECT auth.uid()))
    )
  );
