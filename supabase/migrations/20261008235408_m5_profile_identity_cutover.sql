-- M5: application cutover from Auth actors to canonical pedagogical profiles.
-- Auth UUIDs remain actors; profile UUIDs identify the learner whose data is changed.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.quiz_attempts AS attempt
    LEFT JOIN public.profiles AS profile
      ON profile.auth_user_id = attempt.user_id
     AND profile.organization_id = attempt.organization_id
    WHERE profile.id IS NULL
  ) THEN
    RAISE EXCEPTION 'M5 preflight: a quiz attempt has no exact Auth-to-profile mapping.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.quiz_attempts AS attempt
    JOIN public.profiles AS profile
      ON profile.auth_user_id = attempt.user_id
     AND profile.organization_id = attempt.organization_id
    GROUP BY attempt.id
    HAVING count(*) <> 1
  ) THEN
    RAISE EXCEPTION 'M5 preflight: a quiz attempt has an ambiguous Auth-to-profile mapping.';
  END IF;
END
$$;

ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS profile_id uuid;

UPDATE public.quiz_attempts AS attempt
SET profile_id = profile.id
FROM public.profiles AS profile
WHERE attempt.profile_id IS NULL
  AND profile.auth_user_id = attempt.user_id
  AND profile.organization_id = attempt.organization_id;

ALTER TABLE public.quiz_attempts
  ALTER COLUMN profile_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.quiz_attempts'::regclass
      AND conname = 'quiz_attempts_profile_id_fkey'
  ) THEN
    ALTER TABLE public.quiz_attempts
      ADD CONSTRAINT quiz_attempts_profile_id_fkey
      FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
      ON UPDATE RESTRICT ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS quiz_attempts_profile_id_idx
  ON public.quiz_attempts(profile_id);

ALTER TABLE public.quiz_attempts
  DROP CONSTRAINT IF EXISTS quiz_attempts_quiz_id_user_id_attempt_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS quiz_attempts_quiz_profile_attempt_unique_idx
  ON public.quiz_attempts(quiz_id, profile_id, attempt_number);

CREATE INDEX IF NOT EXISTS quiz_attempts_actor_quiz_idx
  ON public.quiz_attempts(user_id, quiz_id);

CREATE OR REPLACE FUNCTION private.can_profile_access_lesson(
  target_profile_id uuid,
  target_lesson_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT private.can_act_as_profile(target_profile_id))
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      JOIN public.lessons AS lesson
        ON lesson.id = target_lesson_id
       AND lesson.organization_id = profile.organization_id
       AND lesson.status = 'published'
      WHERE profile.id = target_profile_id
        AND (
          lesson.course_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.learner_cohort_memberships AS learner_membership
            JOIN public.course_cohorts AS assignment
              ON assignment.cohort_id = learner_membership.cohort_id
             AND assignment.organization_id = learner_membership.organization_id
            WHERE learner_membership.profile_id = profile.id
              AND learner_membership.organization_id = profile.organization_id
              AND learner_membership.status = 'active'
              AND assignment.course_id = lesson.course_id
          )
          OR private.can_manage_learning(profile.organization_id)
        )
    );
$$;

REVOKE ALL ON FUNCTION private.can_profile_access_lesson(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.can_profile_access_lesson(uuid, uuid)
  TO authenticated, service_role;

DROP POLICY IF EXISTS profiles_update_safe_own_fields ON public.profiles;
CREATE POLICY profiles_update_safe_own_fields
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth_user_id = (SELECT auth.uid()))
WITH CHECK (auth_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profiles_read_organization_managers ON public.profiles;
CREATE POLICY profiles_read_organization_managers
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_memberships AS target_membership
    WHERE target_membership.user_id = profiles.auth_user_id
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

DROP POLICY IF EXISTS progress_read_own_family_or_teacher ON public.progress;
CREATE POLICY progress_read_own_family_or_teacher
ON public.progress
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS profile
    WHERE profile.id = progress.user_id
      AND profile.organization_id = progress.organization_id
  )
  AND (
    private.can_act_as_profile(user_id)
    OR private.can_manage_learning(organization_id)
    OR private.can_teach_profile(user_id)
  )
);

DROP POLICY IF EXISTS progress_write_own ON public.progress;
CREATE POLICY progress_write_own
ON public.progress
FOR INSERT
TO authenticated
WITH CHECK (
  private.can_act_as_profile(user_id)
  AND lesson_id IS NOT NULL
  AND private.can_profile_access_lesson(user_id, lesson_id)
  AND EXISTS (
    SELECT 1 FROM public.profiles AS profile
    WHERE profile.id = progress.user_id
      AND profile.organization_id = progress.organization_id
  )
);

DROP POLICY IF EXISTS progress_update_own ON public.progress;
CREATE POLICY progress_update_own
ON public.progress
FOR UPDATE
TO authenticated
USING (private.can_act_as_profile(user_id))
WITH CHECK (
  private.can_act_as_profile(user_id)
  AND lesson_id IS NOT NULL
  AND private.can_profile_access_lesson(user_id, lesson_id)
  AND EXISTS (
    SELECT 1 FROM public.profiles AS profile
    WHERE profile.id = progress.user_id
      AND profile.organization_id = progress.organization_id
  )
);

DROP POLICY IF EXISTS homework_insert_own ON public.homework_submissions;
CREATE POLICY homework_insert_own
ON public.homework_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  private.can_act_as_profile(user_id)
  AND EXISTS (
    SELECT 1 FROM public.profiles AS profile
    WHERE profile.id = homework_submissions.user_id
      AND profile.organization_id = homework_submissions.organization_id
  )
);

DROP POLICY IF EXISTS homework_read_own_family_or_teacher ON public.homework_submissions;
CREATE POLICY homework_read_own_family_or_teacher
ON public.homework_submissions
FOR SELECT
TO authenticated
USING (
  private.can_act_as_profile(user_id)
  OR private.can_manage_learning(organization_id)
  OR private.can_teach_profile(user_id)
);

DROP POLICY IF EXISTS homework_update_for_assigned_teachers ON public.homework_submissions;
CREATE POLICY homework_update_for_assigned_teachers
ON public.homework_submissions
FOR UPDATE
TO authenticated
USING (
  private.can_manage_learning(organization_id)
  OR private.can_teach_profile(user_id)
)
WITH CHECK (
  private.can_manage_learning(organization_id)
  OR private.can_teach_profile(user_id)
);

DROP POLICY IF EXISTS quiz_attempts_insert ON public.quiz_attempts;
CREATE POLICY quiz_attempts_insert
ON public.quiz_attempts
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND private.can_act_as_profile(profile_id)
  AND EXISTS (
    SELECT 1 FROM public.profiles AS profile
    WHERE profile.id = quiz_attempts.profile_id
      AND profile.organization_id = quiz_attempts.organization_id
  )
  AND EXISTS (
    SELECT 1 FROM public.quizzes AS quiz
    WHERE quiz.id = quiz_attempts.quiz_id
      AND private.can_profile_access_lesson(profile_id, quiz.lesson_id)
  )
);

DROP POLICY IF EXISTS quiz_attempts_read ON public.quiz_attempts;
CREATE POLICY quiz_attempts_read
ON public.quiz_attempts
FOR SELECT
TO authenticated
USING (
  private.can_act_as_profile(profile_id)
  OR private.can_manage_learning(organization_id)
  OR private.can_teach_profile(profile_id)
);

DROP POLICY IF EXISTS quiz_attempts_update ON public.quiz_attempts;
CREATE POLICY quiz_attempts_update
ON public.quiz_attempts
FOR UPDATE
TO authenticated
USING (
  (user_id = (SELECT auth.uid()) AND private.can_act_as_profile(profile_id))
  OR private.can_manage_learning(organization_id)
)
WITH CHECK (
  (user_id = (SELECT auth.uid()) AND private.can_act_as_profile(profile_id))
  OR private.can_manage_learning(organization_id)
);

DROP FUNCTION IF EXISTS public.submit_quiz_attempt(uuid, jsonb);

CREATE FUNCTION public.submit_quiz_attempt(
  p_quiz_id uuid,
  p_answers jsonb,
  p_profile_id uuid DEFAULT NULL
)
RETURNS TABLE(attempt_id uuid, score numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_profile_id uuid;
  v_quiz public.quizzes%ROWTYPE;
  v_attempt_id uuid;
  v_attempt_number integer;
  v_score numeric(5,2);
  v_question_count integer;
  v_answer_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_profile_id IS NULL THEN
    SELECT profile.id INTO STRICT v_profile_id
    FROM public.profiles AS profile
    WHERE profile.auth_user_id = v_user_id;
  ELSE
    v_profile_id := p_profile_id;
  END IF;

  IF NOT private.can_act_as_profile(v_profile_id) THEN
    RAISE EXCEPTION 'Profile access denied' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_answers) <> 'array' THEN
    RAISE EXCEPTION 'Answers must be an array' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_quiz
  FROM public.quizzes
  WHERE id = p_quiz_id
  FOR UPDATE;

  IF NOT FOUND
    OR v_quiz.status <> 'published'
    OR NOT private.can_profile_access_lesson(v_profile_id, v_quiz.lesson_id)
    OR NOT EXISTS (
      SELECT 1 FROM public.profiles AS profile
      WHERE profile.id = v_profile_id
        AND profile.organization_id = v_quiz.organization_id
    )
  THEN
    RAISE EXCEPTION 'Quiz unavailable' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_question_count
  FROM public.quiz_questions
  WHERE quiz_id = p_quiz_id;

  SELECT count(DISTINCT (answer->>'question_id')::uuid) INTO v_answer_count
  FROM jsonb_array_elements(p_answers) AS answer;

  IF v_question_count = 0 OR v_answer_count <> v_question_count THEN
    RAISE EXCEPTION 'Every quiz question must have exactly one answer' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_answers) AS answer
    LEFT JOIN public.quiz_questions AS question
      ON question.id = (answer->>'question_id')::uuid
     AND question.quiz_id = p_quiz_id
    WHERE question.id IS NULL
      OR jsonb_typeof(answer->'selected_option_ids') <> 'array'
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(answer->'selected_option_ids') AS selected(option_id)
        LEFT JOIN public.quiz_options AS option
          ON option.id = selected.option_id::uuid
         AND option.question_id = question.id
        WHERE option.id IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'Invalid quiz answer' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(max(attempt_number), 0) + 1 INTO v_attempt_number
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id AND profile_id = v_profile_id;

  IF v_quiz.max_attempts IS NOT NULL AND v_attempt_number > v_quiz.max_attempts THEN
    RAISE EXCEPTION 'Maximum attempts reached' USING ERRCODE = '22023';
  END IF;

  SELECT round(
    100 * coalesce(sum(
      CASE WHEN ARRAY(
        SELECT key.option_id
        FROM public.quiz_option_keys AS key
        JOIN public.quiz_options AS option ON option.id = key.option_id
        WHERE option.question_id = question.id AND key.is_correct
        ORDER BY key.option_id
      ) = ARRAY(
        SELECT selected.option_id::uuid
        FROM jsonb_array_elements_text(answer->'selected_option_ids') AS selected(option_id)
        ORDER BY selected.option_id::uuid
      ) THEN question.points ELSE 0 END
    ), 0) / greatest(sum(question.points), 1), 2
  ) INTO v_score
  FROM public.quiz_questions AS question
  JOIN jsonb_array_elements(p_answers) AS answer
    ON (answer->>'question_id')::uuid = question.id
  WHERE question.quiz_id = p_quiz_id;

  INSERT INTO public.quiz_attempts (
    organization_id, quiz_id, user_id, profile_id, status, score,
    submitted_at, graded_at, attempt_number
  ) VALUES (
    v_quiz.organization_id, p_quiz_id, v_user_id, v_profile_id, 'graded', v_score,
    now(), now(), v_attempt_number
  ) RETURNING id INTO v_attempt_id;

  INSERT INTO public.quiz_answers (
    organization_id, attempt_id, question_id, selected_option_ids,
    is_correct, points_awarded
  )
  SELECT
    v_quiz.organization_id, v_attempt_id, question.id,
    ARRAY(
      SELECT selected.option_id::uuid
      FROM jsonb_array_elements_text(answer->'selected_option_ids') AS selected(option_id)
    ),
    ARRAY(
      SELECT key.option_id
      FROM public.quiz_option_keys AS key
      JOIN public.quiz_options AS option ON option.id = key.option_id
      WHERE option.question_id = question.id AND key.is_correct
      ORDER BY key.option_id
    ) = ARRAY(
      SELECT selected.option_id::uuid
      FROM jsonb_array_elements_text(answer->'selected_option_ids') AS selected(option_id)
      ORDER BY selected.option_id::uuid
    ),
    CASE WHEN ARRAY(
      SELECT key.option_id
      FROM public.quiz_option_keys AS key
      JOIN public.quiz_options AS option ON option.id = key.option_id
      WHERE option.question_id = question.id AND key.is_correct
      ORDER BY key.option_id
    ) = ARRAY(
      SELECT selected.option_id::uuid
      FROM jsonb_array_elements_text(answer->'selected_option_ids') AS selected(option_id)
      ORDER BY selected.option_id::uuid
    ) THEN question.points ELSE 0 END
  FROM public.quiz_questions AS question
  JOIN jsonb_array_elements(p_answers) AS answer
    ON (answer->>'question_id')::uuid = question.id
  WHERE question.quiz_id = p_quiz_id;

  UPDATE public.progress
  SET status = 'completed', completed_at = now()
  WHERE organization_id = v_quiz.organization_id
    AND user_id = v_profile_id
    AND lesson_id = v_quiz.lesson_id;

  IF NOT FOUND THEN
    INSERT INTO public.progress (organization_id, user_id, lesson_id, status, completed_at)
    VALUES (v_quiz.organization_id, v_profile_id, v_quiz.lesson_id, 'completed', now());
  END IF;

  RETURN QUERY SELECT v_attempt_id, v_score;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid, jsonb, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb, uuid)
  TO authenticated, service_role;

UPDATE public.organizations
SET feature_flags = coalesce(feature_flags, '{}'::jsonb)
  || jsonb_build_object('profile_identity_v2', true),
    updated_at = now();
