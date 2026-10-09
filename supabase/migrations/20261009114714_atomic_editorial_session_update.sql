-- Atomic editorial update: moving a session also keeps its resources on the same lesson.

-- M7's bridge originally assumed exactly one session per lesson even when a resource
-- already carried an explicit session_id. Keep the strict legacy inference for null
-- session_id values, but validate explicit links by identity so multi-session lessons
-- remain unambiguous.
CREATE OR REPLACE FUNCTION private.bridge_resource_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  mapped_session_id uuid;
BEGIN
  IF NEW.session_id IS NULL THEN
    SELECT session.id INTO STRICT mapped_session_id
    FROM public.sessions AS session
    WHERE session.lesson_id = NEW.lesson_id
      AND session.organization_id = NEW.organization_id;
    NEW.session_id := mapped_session_id;
  ELSE
    PERFORM 1
    FROM public.sessions AS session
    WHERE session.id = NEW.session_id
      AND session.lesson_id = NEW.lesson_id
      AND session.organization_id = NEW.organization_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Resource session does not match its legacy lesson.';
    END IF;
  END IF;
  RETURN NEW;
END
$function$;

CREATE OR REPLACE FUNCTION public.update_editorial_session(
  p_session_id uuid,
  p_title text,
  p_summary text,
  p_lesson_id uuid,
  p_order_index integer,
  p_duration_minutes integer,
  p_status text,
  p_learning_points jsonb,
  p_reflection_questions jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_organization_id uuid;
  v_target_organization_id uuid;
BEGIN
  SELECT session.organization_id
  INTO v_organization_id
  FROM public.sessions AS session
  WHERE session.id = p_session_id;

  IF v_organization_id IS NULL OR NOT private.can_manage_learning(v_organization_id) THEN
    RAISE EXCEPTION 'Editorial permission denied' USING ERRCODE = '42501';
  END IF;

  SELECT lesson.organization_id
  INTO v_target_organization_id
  FROM public.lessons AS lesson
  WHERE lesson.id = p_lesson_id;

  IF v_target_organization_id IS DISTINCT FROM v_organization_id THEN
    RAISE EXCEPTION 'The target lesson must belong to the same organization' USING ERRCODE = '23514';
  END IF;
  IF btrim(COALESCE(p_title, '')) = ''
     OR p_order_index < 0
     OR (p_duration_minutes IS NOT NULL AND p_duration_minutes <= 0)
     OR p_status NOT IN ('draft','published','archived')
     OR jsonb_typeof(p_learning_points) <> 'array'
     OR jsonb_typeof(p_reflection_questions) <> 'array' THEN
    RAISE EXCEPTION 'Invalid editorial session payload' USING ERRCODE = '22023';
  END IF;

  UPDATE public.sessions
  SET title = btrim(p_title),
      summary = NULLIF(btrim(COALESCE(p_summary, '')), ''),
      lesson_id = p_lesson_id,
      order_index = p_order_index,
      duration_minutes = p_duration_minutes,
      status = p_status,
      learning_points = p_learning_points,
      reflection_questions = p_reflection_questions,
      published_at = CASE WHEN p_status = 'published' THEN COALESCE(published_at, now()) ELSE NULL END,
      updated_at = now()
  WHERE id = p_session_id;

  WITH target_order AS (
    SELECT COALESCE(MAX(resource.order_index), -1) AS last_order
    FROM public.lesson_resources AS resource
    WHERE resource.lesson_id = p_lesson_id
      AND resource.session_id IS DISTINCT FROM p_session_id
  ),
  moved_resources AS (
    SELECT resource.id,
           row_number() OVER (ORDER BY resource.order_index, resource.id) - 1 AS relative_order
    FROM public.lesson_resources AS resource
    WHERE resource.session_id = p_session_id
      AND resource.lesson_id IS DISTINCT FROM p_lesson_id
  )
  UPDATE public.lesson_resources AS resource
  SET lesson_id = p_lesson_id,
      order_index = target_order.last_order + moved_resources.relative_order + 1,
      updated_at = now()
  FROM moved_resources, target_order
  WHERE resource.id = moved_resources.id;
END
$function$;

REVOKE ALL ON FUNCTION public.update_editorial_session(uuid,text,text,uuid,integer,integer,text,jsonb,jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_editorial_session(uuid,text,text,uuid,integer,integer,text,jsonb,jsonb)
  TO authenticated;

COMMENT ON FUNCTION public.update_editorial_session(uuid,text,text,uuid,integer,integer,text,jsonb,jsonb)
IS 'Atomic editorial session update for organization learning managers; preserves session/resource identity.';
