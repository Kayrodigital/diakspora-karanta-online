-- Learners can only read published quizzes. Teaching staff retain draft access.
DROP POLICY quizzes_read ON public.quizzes;
CREATE POLICY quizzes_read ON public.quizzes FOR SELECT TO authenticated
  USING (
    private.can_manage_learning(organization_id)
    OR (status = 'published' AND private.can_access_lesson(lesson_id))
  );

DROP POLICY quiz_questions_read ON public.quiz_questions;
CREATE POLICY quiz_questions_read ON public.quiz_questions FOR SELECT TO authenticated
  USING (
    private.can_manage_learning(organization_id)
    OR EXISTS (
      SELECT 1
      FROM public.quizzes quiz
      WHERE quiz.id = quiz_id
        AND quiz.status = 'published'
        AND private.can_access_lesson(quiz.lesson_id)
    )
  );

DROP POLICY quiz_options_read_without_answers ON public.quiz_options;
CREATE POLICY quiz_options_read_without_answers ON public.quiz_options FOR SELECT TO authenticated
  USING (
    private.can_manage_learning(organization_id)
    OR EXISTS (
      SELECT 1
      FROM public.quiz_questions question
      JOIN public.quizzes quiz ON quiz.id = question.quiz_id
      WHERE question.id = question_id
        AND quiz.status = 'published'
        AND private.can_access_lesson(quiz.lesson_id)
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS progress_user_lesson_unique
  ON public.progress (organization_id, user_id, lesson_id)
  WHERE organization_id IS NOT NULL AND user_id IS NOT NULL AND lesson_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_quiz_id uuid,
  p_answers jsonb
)
RETURNS TABLE (attempt_id uuid, score numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
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

  IF jsonb_typeof(p_answers) <> 'array' THEN
    RAISE EXCEPTION 'Answers must be an array' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_quiz
  FROM public.quizzes
  WHERE id = p_quiz_id
  FOR UPDATE;

  IF NOT FOUND
    OR v_quiz.status <> 'published'
    OR NOT private.can_access_lesson(v_quiz.lesson_id)
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
    LEFT JOIN public.quiz_questions question
      ON question.id = (answer->>'question_id')::uuid
      AND question.quiz_id = p_quiz_id
    WHERE question.id IS NULL
      OR jsonb_typeof(answer->'selected_option_ids') <> 'array'
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(answer->'selected_option_ids') AS selected(option_id)
        LEFT JOIN public.quiz_options option
          ON option.id = selected.option_id::uuid
          AND option.question_id = question.id
        WHERE option.id IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'Invalid quiz answer' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(max(attempt_number), 0) + 1 INTO v_attempt_number
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id AND user_id = v_user_id;

  IF v_quiz.max_attempts IS NOT NULL AND v_attempt_number > v_quiz.max_attempts THEN
    RAISE EXCEPTION 'Maximum attempts reached' USING ERRCODE = '22023';
  END IF;

  SELECT round(
    100 * coalesce(sum(
      CASE WHEN
        ARRAY(
          SELECT key.option_id
          FROM public.quiz_option_keys key
          JOIN public.quiz_options option ON option.id = key.option_id
          WHERE option.question_id = question.id AND key.is_correct
          ORDER BY key.option_id
        ) = ARRAY(
          SELECT selected.option_id::uuid
          FROM jsonb_array_elements_text(answer->'selected_option_ids') AS selected(option_id)
          ORDER BY selected.option_id::uuid
        )
      THEN question.points ELSE 0 END
    ), 0) / greatest(sum(question.points), 1),
    2
  ) INTO v_score
  FROM public.quiz_questions question
  JOIN jsonb_array_elements(p_answers) AS answer
    ON (answer->>'question_id')::uuid = question.id
  WHERE question.quiz_id = p_quiz_id;

  INSERT INTO public.quiz_attempts (
    organization_id, quiz_id, user_id, status, score,
    submitted_at, graded_at, attempt_number
  ) VALUES (
    v_quiz.organization_id, p_quiz_id, v_user_id, 'graded', v_score,
    now(), now(), v_attempt_number
  )
  RETURNING id INTO v_attempt_id;

  INSERT INTO public.quiz_answers (
    organization_id, attempt_id, question_id, selected_option_ids,
    is_correct, points_awarded
  )
  SELECT
    v_quiz.organization_id,
    v_attempt_id,
    question.id,
    ARRAY(
      SELECT selected.option_id::uuid
      FROM jsonb_array_elements_text(answer->'selected_option_ids') AS selected(option_id)
    ),
    ARRAY(
      SELECT key.option_id
      FROM public.quiz_option_keys key
      JOIN public.quiz_options option ON option.id = key.option_id
      WHERE option.question_id = question.id AND key.is_correct
      ORDER BY key.option_id
    ) = ARRAY(
      SELECT selected.option_id::uuid
      FROM jsonb_array_elements_text(answer->'selected_option_ids') AS selected(option_id)
      ORDER BY selected.option_id::uuid
    ),
    CASE WHEN
      ARRAY(
        SELECT key.option_id
        FROM public.quiz_option_keys key
        JOIN public.quiz_options option ON option.id = key.option_id
        WHERE option.question_id = question.id AND key.is_correct
        ORDER BY key.option_id
      ) = ARRAY(
        SELECT selected.option_id::uuid
        FROM jsonb_array_elements_text(answer->'selected_option_ids') AS selected(option_id)
        ORDER BY selected.option_id::uuid
      )
    THEN question.points ELSE 0 END
  FROM public.quiz_questions question
  JOIN jsonb_array_elements(p_answers) AS answer
    ON (answer->>'question_id')::uuid = question.id
  WHERE question.quiz_id = p_quiz_id;

  UPDATE public.progress
  SET status = 'completed', completed_at = now()
  WHERE organization_id = v_quiz.organization_id
    AND user_id = v_user_id
    AND lesson_id = v_quiz.lesson_id;

  IF NOT FOUND THEN
    INSERT INTO public.progress (organization_id, user_id, lesson_id, status, completed_at)
    VALUES (v_quiz.organization_id, v_user_id, v_quiz.lesson_id, 'completed', now());
  END IF;

  RETURN QUERY SELECT v_attempt_id, v_score;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, jsonb) TO authenticated;
